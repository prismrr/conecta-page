#!/usr/bin/env python3
"""Development server for static files + telemetry collector endpoint."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_LOG_FILE = ROOT_DIR / "logs" / "telemetry-events.ndjson"
MAX_BODY_BYTES = 1_000_000


class ConectaRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, log_file: Path, **kwargs):
        self.log_file = log_file
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def _write_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> tuple[bool, dict]:
        content_length = self.headers.get("Content-Length", "0")

        try:
            length = int(content_length)
        except ValueError:
            return False, {"error": "invalid_content_length"}

        if length <= 0:
            return False, {"error": "empty_body"}

        if length > MAX_BODY_BYTES:
            return False, {"error": "body_too_large"}

        body = self.rfile.read(length)

        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return False, {"error": "invalid_json"}

        if not isinstance(payload, dict):
            return False, {"error": "payload_must_be_object"}

        return True, payload

    def _append_event(self, payload: dict) -> None:
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        event = {
            "receivedAt": datetime.now(tz=timezone.utc).isoformat(),
            "payload": payload,
        }
        with self.log_file.open("a", encoding="utf-8") as fp:
            fp.write(json.dumps(event, ensure_ascii=True) + "\n")

    def do_OPTIONS(self) -> None:
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/telemetry/events":
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        self.send_error(404, "Not Found")

    def do_POST(self) -> None:
        parsed_path = urlparse(self.path)
        if parsed_path.path != "/telemetry/events":
            self.send_error(404, "Not Found")
            return

        ok, result = self._read_json_body()
        if not ok:
            self._write_json(400, {"ok": False, **result})
            return

        self._append_event(result)
        self._write_json(202, {"ok": True})

    def do_GET(self) -> None:
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/healthz":
            self._write_json(200, {"ok": True})
            return

        registration_prefix = "/api/registrations/"
        if parsed_path.path.startswith(registration_prefix):
            registration_id = parsed_path.path[len(registration_prefix) :].strip()
            if not registration_id:
                self._write_json(400, {"ok": False, "error": "missing_registration_id"})
                return

            status_code, payload = self._mock_registration_result(registration_id)
            self._write_json(status_code, payload)
            return

        super().do_GET()

    def _mock_registration_result(self, registration_id: str) -> tuple[int, dict]:
        upper_id = registration_id.upper()

        if upper_id.endswith("404"):
            return 404, {"ok": False, "error": "not_found"}

        if upper_id.endswith("401"):
            return 401, {"ok": False, "error": "unauthorized"}

        if upper_id.endswith("503"):
            return 503, {"ok": False, "error": "provider_unavailable"}

        if upper_id.endswith("999"):
            # Intentionally invalid contract payload to test degraded mode.
            return 200, {
                "registrationId": upper_id,
                "status": "UNKNOWN"
            }

        numeric_tail = "".join([ch for ch in upper_id if ch.isdigit()])
        last_digit = int(numeric_tail[-1]) if numeric_tail else 0

        if last_digit in {1, 3, 5, 7, 9}:
            status = "APPROVED"
            detail = "Classificado para a trilha principal"
        elif last_digit in {0, 2, 4, 6, 8}:
            status = "UNDER_REVIEW"
            detail = "Avaliacao em andamento"
        else:
            status = "REJECTED"
            detail = "Nao classificado nesta rodada"

        return 200, {
            "registrationId": upper_id,
            "status": status,
            "updatedAt": datetime.now(tz=timezone.utc).isoformat(),
            "detail": detail,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve static site and collect telemetry events locally."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host address")
    parser.add_argument("--port", default=8080, type=int, help="Port number")
    parser.add_argument(
        "--log-file",
        default=str(DEFAULT_LOG_FILE),
        help="Path to telemetry log file (NDJSON)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    log_file = Path(args.log_file)

    def handler(*handler_args, **handler_kwargs):
        return ConectaRequestHandler(
            *handler_args,
            log_file=log_file,
            **handler_kwargs,
        )

    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {ROOT_DIR} at http://{args.host}:{args.port}")
    print(f"Telemetry collector endpoint: http://{args.host}:{args.port}/telemetry/events")
    print(f"Telemetry log file: {log_file}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
