#!/usr/bin/env python3
"""Development server for static files + telemetry collector endpoint."""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_LOG_FILE = ROOT_DIR / "logs" / "telemetry-events.ndjson"
DEFAULT_DB_FILE = ROOT_DIR / "data" / "compliance.db"
MAX_BODY_BYTES = 1_000_000

DEFAULT_CONTENT_AUDIT_EVENTS = [
    {
        "eventId": "AUD-20260512-001",
        "changedAt": "2026-05-12T14:20:00Z",
        "contentDomain": "privacy_policy",
        "contentTitle": "Politica de Privacidade",
        "version": "v2026.0",
        "author": "Time de Compliance",
        "changeSummary": "Publicacao inicial do resumo de privacidade do portal.",
        "changeType": "publish",
    },
    {
        "eventId": "AUD-20260520-001",
        "changedAt": "2026-05-20T10:30:00Z",
        "contentDomain": "registration_guidance",
        "contentTitle": "Orientacoes de Inscricao",
        "version": "v2026.2",
        "author": "Comite de Programa PRISM",
        "changeSummary": "Consolidacao de criterios, vigencia e fluxo oficial para submissao externa.",
        "changeType": "publish",
    },
    {
        "eventId": "AUD-20260523-001",
        "changedAt": "2026-05-23T09:10:00Z",
        "contentDomain": "terms_of_use",
        "contentTitle": "Termos de Uso",
        "version": "v2026.1",
        "author": "Time Juridico e Compliance",
        "changeSummary": "Publicacao versionada com regras de uso aceitavel e limites de responsabilidade.",
        "changeType": "publish",
    },
    {
        "eventId": "AUD-20260523-002",
        "changedAt": "2026-05-23T11:05:00Z",
        "contentDomain": "privacy_policy",
        "contentTitle": "Politica de Privacidade",
        "version": "v2026.1",
        "author": "Time de Compliance",
        "changeSummary": "Atualizacao de vigencia, changelog e transparencia de cookies por categoria.",
        "changeType": "revision",
    },
    {
        "eventId": "AUD-20260523-003",
        "changedAt": "2026-05-23T12:40:00Z",
        "contentDomain": "faq",
        "contentTitle": "FAQ Curada",
        "version": "v2026.1",
        "author": "Equipe Editorial Conecta",
        "changeSummary": "Publicacao de respostas oficiais consolidadas a partir das paginas criticas do portal.",
        "changeType": "publish",
    },
]


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def create_connection(db_file: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(str(db_file))
    connection.row_factory = sqlite3.Row
    return connection


def init_database(db_file: Path) -> None:
    db_file.parent.mkdir(parents=True, exist_ok=True)
    with create_connection(db_file) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS consent_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recorded_at TEXT NOT NULL,
                version TEXT NOT NULL,
                updated_at TEXT,
                source TEXT,
                status TEXT NOT NULL,
                categories_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS integration_monitor_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recorded_at TEXT NOT NULL,
                outcome TEXT NOT NULL,
                signal TEXT NOT NULL,
                detail TEXT,
                source_page TEXT
            );

            CREATE TABLE IF NOT EXISTS content_audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL UNIQUE,
                changed_at TEXT NOT NULL,
                content_domain TEXT NOT NULL,
                content_title TEXT NOT NULL,
                version TEXT NOT NULL,
                author TEXT NOT NULL,
                change_summary TEXT NOT NULL,
                change_type TEXT NOT NULL,
                recorded_at TEXT NOT NULL
            );
            """
        )

        existing_count = conn.execute("SELECT COUNT(1) AS total FROM content_audit_events").fetchone()["total"]
        if existing_count == 0:
            for event in DEFAULT_CONTENT_AUDIT_EVENTS:
                conn.execute(
                    """
                    INSERT INTO content_audit_events (
                        event_id,
                        changed_at,
                        content_domain,
                        content_title,
                        version,
                        author,
                        change_summary,
                        change_type,
                        recorded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event["eventId"],
                        event["changedAt"],
                        event["contentDomain"],
                        event["contentTitle"],
                        event["version"],
                        event["author"],
                        event["changeSummary"],
                        event["changeType"],
                        utc_now_iso(),
                    ),
                )


class ConectaRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, log_file: Path, db_file: Path, **kwargs):
        self.log_file = log_file
        self.db_file = db_file
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
            "receivedAt": utc_now_iso(),
            "payload": payload,
        }
        with self.log_file.open("a", encoding="utf-8") as fp:
            fp.write(json.dumps(event, ensure_ascii=True) + "\n")

    def _compliance_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _read_limit_param(self, parsed_path, default: int = 20, maximum: int = 200) -> int:
        query = parse_qs(parsed_path.query)
        value = query.get("limit", [str(default)])[0]
        try:
            parsed = int(value)
        except ValueError:
            return default
        return max(1, min(parsed, maximum))

    def _store_consent_record(self, payload: dict) -> tuple[bool, dict]:
        categories = payload.get("categories")
        if not isinstance(categories, dict):
            return False, {"error": "categories_must_be_object"}

        version = str(payload.get("version", "")).strip()
        status = str(payload.get("status", "")).strip()
        if not version:
            return False, {"error": "missing_version"}
        if status not in {"granted", "revoked"}:
            return False, {"error": "invalid_status"}

        updated_at = str(payload.get("updatedAt", "")).strip() or None
        source = str(payload.get("source", "")).strip() or None
        safe_categories = {
            "essential": bool(categories.get("essential", True)),
            "analytics_optional": bool(categories.get("analytics_optional", False)),
            "communication_optional": bool(categories.get("communication_optional", False)),
        }

        with create_connection(self.db_file) as conn:
            conn.execute(
                """
                INSERT INTO consent_records (
                    recorded_at,
                    version,
                    updated_at,
                    source,
                    status,
                    categories_json
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (utc_now_iso(), version, updated_at, source, status, json.dumps(safe_categories, ensure_ascii=True)),
            )

        return True, {"ok": True}

    def _list_consent_records(self, limit: int) -> list[dict]:
        with create_connection(self.db_file) as conn:
            rows = conn.execute(
                """
                SELECT recorded_at, version, updated_at, source, status, categories_json
                FROM consent_records
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        items = []
        for row in rows:
            try:
                categories = json.loads(row["categories_json"])
            except json.JSONDecodeError:
                categories = {}

            items.append(
                {
                    "recordedAt": row["recorded_at"],
                    "version": row["version"],
                    "updatedAt": row["updated_at"],
                    "source": row["source"],
                    "status": row["status"],
                    "categories": categories,
                }
            )

        return items

    def _store_integration_event(self, payload: dict) -> tuple[bool, dict]:
        outcome = str(payload.get("outcome", "")).strip()
        signal = str(payload.get("signal", "")).strip()
        if not outcome:
            return False, {"error": "missing_outcome"}
        if signal not in {"available", "degraded", "unavailable", "unknown"}:
            return False, {"error": "invalid_signal"}

        detail = str(payload.get("detail", "")).strip() or None
        source_page = str(payload.get("sourcePage", "")).strip() or None

        with create_connection(self.db_file) as conn:
            conn.execute(
                """
                INSERT INTO integration_monitor_events (
                    recorded_at,
                    outcome,
                    signal,
                    detail,
                    source_page
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (utc_now_iso(), outcome, signal, detail, source_page),
            )

        return True, {"ok": True}

    def _read_integration_summary(self) -> dict:
        with create_connection(self.db_file) as conn:
            totals = conn.execute(
                """
                SELECT
                    COUNT(1) AS total_checks,
                    SUM(CASE WHEN signal = 'available' THEN 1 ELSE 0 END) AS available_checks,
                    SUM(CASE WHEN signal = 'degraded' THEN 1 ELSE 0 END) AS degraded_checks,
                    SUM(CASE WHEN signal IN ('degraded', 'unavailable') THEN 1 ELSE 0 END) AS provider_failures
                FROM integration_monitor_events
                """
            ).fetchone()

            latest = conn.execute(
                """
                SELECT recorded_at, outcome, signal, detail
                FROM integration_monitor_events
                ORDER BY id DESC
                LIMIT 1
                """
            ).fetchone()

        return {
            "totalChecks": int(totals["total_checks"] or 0),
            "availableChecks": int(totals["available_checks"] or 0),
            "degradedChecks": int(totals["degraded_checks"] or 0),
            "providerFailures": int(totals["provider_failures"] or 0),
            "lastEvent": (
                {
                    "recordedAt": latest["recorded_at"],
                    "outcome": latest["outcome"],
                    "signal": latest["signal"],
                    "detail": latest["detail"] or "Sem detalhe adicional.",
                }
                if latest
                else None
            ),
        }

    def _store_content_audit_event(self, payload: dict) -> tuple[bool, dict]:
        required_keys = [
            "eventId",
            "changedAt",
            "contentDomain",
            "contentTitle",
            "version",
            "author",
            "changeSummary",
            "changeType",
        ]
        for key in required_keys:
            if not str(payload.get(key, "")).strip():
                return False, {"error": f"missing_{key}"}

        try:
            with create_connection(self.db_file) as conn:
                conn.execute(
                    """
                    INSERT INTO content_audit_events (
                        event_id,
                        changed_at,
                        content_domain,
                        content_title,
                        version,
                        author,
                        change_summary,
                        change_type,
                        recorded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(payload.get("eventId")).strip(),
                        str(payload.get("changedAt")).strip(),
                        str(payload.get("contentDomain")).strip(),
                        str(payload.get("contentTitle")).strip(),
                        str(payload.get("version")).strip(),
                        str(payload.get("author")).strip(),
                        str(payload.get("changeSummary")).strip(),
                        str(payload.get("changeType")).strip(),
                        utc_now_iso(),
                    ),
                )
        except sqlite3.IntegrityError:
            return False, {"error": "event_id_already_exists"}

        return True, {"ok": True}

    def _list_content_audit_events(self, limit: int) -> list[dict]:
        with create_connection(self.db_file) as conn:
            rows = conn.execute(
                """
                SELECT
                    event_id,
                    changed_at,
                    content_domain,
                    content_title,
                    version,
                    author,
                    change_summary,
                    change_type
                FROM content_audit_events
                ORDER BY changed_at DESC, id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [
            {
                "eventId": row["event_id"],
                "changedAt": row["changed_at"],
                "contentDomain": row["content_domain"],
                "contentTitle": row["content_title"],
                "version": row["version"],
                "author": row["author"],
                "changeSummary": row["change_summary"],
                "changeType": row["change_type"],
            }
            for row in rows
        ]

    def do_OPTIONS(self) -> None:
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/telemetry/events" or parsed_path.path.startswith("/compliance/"):
            self.send_response(204)
            self._compliance_cors_headers()
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        self.send_error(404, "Not Found")

    def do_POST(self) -> None:
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/telemetry/events":
            ok, result = self._read_json_body()
            if not ok:
                self._write_json(400, {"ok": False, **result})
                return

            self._append_event(result)
            self._write_json(202, {"ok": True})
            return

        if parsed_path.path == "/compliance/consent-records":
            ok, result = self._read_json_body()
            if not ok:
                self._write_json(400, {"ok": False, **result})
                return
            persisted, payload = self._store_consent_record(result)
            self._write_json(201 if persisted else 400, payload if persisted else {"ok": False, **payload})
            return

        if parsed_path.path == "/compliance/integration-events":
            ok, result = self._read_json_body()
            if not ok:
                self._write_json(400, {"ok": False, **result})
                return
            persisted, payload = self._store_integration_event(result)
            self._write_json(201 if persisted else 400, payload if persisted else {"ok": False, **payload})
            return

        if parsed_path.path == "/compliance/content-audit-events":
            ok, result = self._read_json_body()
            if not ok:
                self._write_json(400, {"ok": False, **result})
                return

            persisted, payload = self._store_content_audit_event(result)
            if not persisted and payload.get("error") == "event_id_already_exists":
                self._write_json(409, {"ok": False, **payload})
                return

            self._write_json(201 if persisted else 400, payload if persisted else {"ok": False, **payload})
            return

        self.send_error(404, "Not Found")

    def do_GET(self) -> None:
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/healthz":
            self._write_json(200, {"ok": True})
            return

        if parsed_path.path == "/compliance/consent-records":
            limit = self._read_limit_param(parsed_path, default=20, maximum=200)
            self._write_json(200, {"ok": True, "records": self._list_consent_records(limit)})
            return

        if parsed_path.path == "/compliance/integration-summary":
            summary = self._read_integration_summary()
            self._write_json(200, {"ok": True, "summary": summary})
            return

        if parsed_path.path == "/compliance/content-audit-events":
            limit = self._read_limit_param(parsed_path, default=50, maximum=500)
            self._write_json(200, {"ok": True, "events": self._list_content_audit_events(limit)})
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
            "updatedAt": utc_now_iso(),
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
    parser.add_argument(
        "--db-file",
        default=str(DEFAULT_DB_FILE),
        help="Path to SQLite database for compliance persistence",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    log_file = Path(args.log_file)
    db_file = Path(args.db_file)
    init_database(db_file)

    def handler(*handler_args, **handler_kwargs):
        return ConectaRequestHandler(
            *handler_args,
            log_file=log_file,
            db_file=db_file,
            **handler_kwargs,
        )

    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {ROOT_DIR} at http://{args.host}:{args.port}")
    print(f"Telemetry collector endpoint: http://{args.host}:{args.port}/telemetry/events")
    print(f"Telemetry log file: {log_file}")
    print(f"Compliance database file: {db_file}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
