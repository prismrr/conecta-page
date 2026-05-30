#!/usr/bin/env python3
"""Development server for static files + telemetry collector endpoint."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_STATIC_DIR = ROOT_DIR / "nuxt-app" / ".output" / "public"
DEFAULT_LOG_FILE = ROOT_DIR / "logs" / "telemetry-events.ndjson"
DEFAULT_DB_FILE = ROOT_DIR / "data" / "compliance.db"
MAX_BODY_BYTES = 1_000_000
DEFAULT_ALERT_FAILURE_THRESHOLD = 3
DEFAULT_ALERT_WINDOW_MINUTES = 15
DEFAULT_FORWARD_TIMEOUT_SECONDS = 3

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

            CREATE TABLE IF NOT EXISTS telemetry_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recorded_at TEXT NOT NULL,
                event_name TEXT NOT NULL,
                page TEXT,
                path TEXT,
                release_id TEXT,
                environment TEXT,
                source_channel TEXT,
                session_id TEXT,
                outcome TEXT,
                reason TEXT,
                payload_json TEXT NOT NULL,
                forward_status TEXT NOT NULL,
                forward_error TEXT
            );

            CREATE TABLE IF NOT EXISTS observability_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                release_id TEXT,
                message TEXT NOT NULL,
                details_json TEXT NOT NULL,
                fingerprint TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS compliance_retention_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                executed_at TEXT NOT NULL,
                mode TEXT NOT NULL,
                report_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS compliance_incident_drills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                executed_at TEXT NOT NULL,
                scenario_id TEXT NOT NULL,
                status TEXT NOT NULL,
                report_json TEXT NOT NULL
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
    def __init__(
        self,
        *args,
        static_dir: Path,
        log_file: Path,
        db_file: Path,
        telemetry_forward_url: str,
        telemetry_forward_provider: str,
        telemetry_forward_auth_type: str,
        telemetry_forward_auth_token: str,
        telemetry_forward_auth_header: str,
        telemetry_forward_username: str,
        telemetry_forward_password: str,
        telemetry_forward_timeout_seconds: int,
        alert_failure_threshold: int,
        alert_window_minutes: int,
        **kwargs,
    ):
        self.log_file = log_file
        self.db_file = db_file
        self.telemetry_forward_url = telemetry_forward_url.strip()
        self.telemetry_forward_provider = telemetry_forward_provider.strip().lower() or "raw"
        self.telemetry_forward_auth_type = telemetry_forward_auth_type.strip().lower() or "none"
        self.telemetry_forward_auth_token = telemetry_forward_auth_token.strip()
        self.telemetry_forward_auth_header = telemetry_forward_auth_header.strip() or "X-API-Key"
        self.telemetry_forward_username = telemetry_forward_username.strip()
        self.telemetry_forward_password = telemetry_forward_password.strip()
        self.telemetry_forward_timeout_seconds = max(1, int(telemetry_forward_timeout_seconds))
        self.alert_failure_threshold = max(1, int(alert_failure_threshold))
        self.alert_window_minutes = max(1, int(alert_window_minutes))
        super().__init__(*args, directory=str(static_dir), **kwargs)

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

    def _validate_telemetry_payload(self, payload: dict) -> tuple[bool, dict]:
        required_string_fields = [
            "event",
            "timestamp",
            "page",
            "path",
            "release_id",
            "environment",
            "source_channel",
            "session_id",
        ]

        for field in required_string_fields:
            value = payload.get(field)
            if not isinstance(value, str) or not value.strip():
                return False, {"error": f"missing_or_invalid_{field}"}

        data = payload.get("data")
        if not isinstance(data, dict):
            return False, {"error": "missing_or_invalid_data"}

        timestamp_raw = payload.get("timestamp", "")
        try:
            datetime.fromisoformat(str(timestamp_raw).replace("Z", "+00:00"))
        except ValueError:
            return False, {"error": "invalid_timestamp"}

        return True, {"ok": True}

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

    def _read_window_minutes_param(self, parsed_path, default: int = 60, maximum: int = 1440) -> int:
        query = parse_qs(parsed_path.query)
        value = query.get("windowMinutes", [str(default)])[0]
        try:
            parsed = int(value)
        except ValueError:
            return default
        return max(1, min(parsed, maximum))

    def _build_forward_headers(self) -> tuple[dict, str | None]:
        headers = {"Content-Type": "application/json"}

        if self.telemetry_forward_auth_type == "none":
            return headers, None

        if self.telemetry_forward_auth_type == "bearer":
            if not self.telemetry_forward_auth_token:
                return headers, "missing_bearer_token"
            headers["Authorization"] = f"Bearer {self.telemetry_forward_auth_token}"
            return headers, None

        if self.telemetry_forward_auth_type == "x-api-key":
            if not self.telemetry_forward_auth_token:
                return headers, "missing_api_key_token"
            headers[self.telemetry_forward_auth_header] = self.telemetry_forward_auth_token
            return headers, None

        if self.telemetry_forward_auth_type == "basic":
            if not self.telemetry_forward_username or not self.telemetry_forward_password:
                return headers, "missing_basic_credentials"
            raw = f"{self.telemetry_forward_username}:{self.telemetry_forward_password}".encode("utf-8")
            encoded = base64.b64encode(raw).decode("ascii")
            headers["Authorization"] = f"Basic {encoded}"
            return headers, None

        return headers, "invalid_auth_type"

    def _build_forward_payload(self, payload: dict) -> tuple[bytes, str | None]:
        if self.telemetry_forward_provider == "raw":
            return json.dumps(payload, ensure_ascii=True).encode("utf-8"), None

        if self.telemetry_forward_provider == "loki":
            now_ns = str(int(datetime.now(tz=timezone.utc).timestamp() * 1_000_000_000))
            labels = {
                "job": "conecta-telemetry",
                "environment": str(payload.get("environment", "unknown")),
                "release_id": str(payload.get("release_id", "unknown")),
                "event": str(payload.get("event", "unknown")),
                "source_channel": str(payload.get("source_channel", "unknown")),
            }
            loki_payload = {
                "streams": [
                    {
                        "stream": labels,
                        "values": [[now_ns, json.dumps(payload, ensure_ascii=True)]],
                    }
                ]
            }
            return json.dumps(loki_payload, ensure_ascii=True).encode("utf-8"), None

        return b"", "invalid_provider"

    def _forward_telemetry(self, payload: dict) -> tuple[str, str | None]:
        if not self.telemetry_forward_url:
            return "not_configured", None

        headers, auth_error = self._build_forward_headers()
        if auth_error:
            return "forward_config_error", auth_error

        body, payload_error = self._build_forward_payload(payload)
        if payload_error:
            return "forward_config_error", payload_error

        request = Request(
            self.telemetry_forward_url,
            method="POST",
            headers=headers,
            data=body,
        )

        try:
            with urlopen(request, timeout=self.telemetry_forward_timeout_seconds) as response:
                if 200 <= response.status < 300:
                    return "forwarded", None
                return f"forward_failed_http_{response.status}", f"http_status_{response.status}"
        except Exception as error:  # nosec B110 - operational fallback path
            return "forward_failed", str(error)

    def _create_basic_alerts(self, release_id: str) -> None:
        cutoff = (datetime.now(tz=timezone.utc) - timedelta(minutes=self.alert_window_minutes)).isoformat()
        with create_connection(self.db_file) as conn:
            row = conn.execute(
                """
                SELECT COUNT(1) AS total
                FROM telemetry_events
                WHERE event_name = 'external_data_sync_failed' AND recorded_at >= ?
                AND COALESCE(release_id, 'unknown') = COALESCE(?, 'unknown')
                """,
                (cutoff, release_id or "unknown"),
            ).fetchone()

            total_failures = int(row["total"] or 0)
            if total_failures < self.alert_failure_threshold:
                return

            release_key = release_id or "unknown"
            now = datetime.now(tz=timezone.utc)
            window_bucket = int(now.timestamp() // (self.alert_window_minutes * 60))
            fingerprint = f"external_data_sync_failed_spike:{release_key}:{window_bucket}"

            details = {
                "windowMinutes": self.alert_window_minutes,
                "failureCount": total_failures,
                "threshold": self.alert_failure_threshold,
                "releaseId": release_key,
            }

            conn.execute(
                """
                INSERT OR IGNORE INTO observability_alerts (
                    created_at,
                    alert_type,
                    severity,
                    release_id,
                    message,
                    details_json,
                    fingerprint
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    utc_now_iso(),
                    "external_data_sync_failed_spike",
                    "high",
                    release_key,
                    "Falhas de sincronizacao externa acima do limiar na janela configurada.",
                    json.dumps(details, ensure_ascii=True),
                    fingerprint,
                ),
            )

    def _store_telemetry_event(self, payload: dict, forward_status: str, forward_error: str | None) -> None:
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        event_name = str(payload.get("event", "unknown"))
        release_id = str(payload.get("release_id", "unknown"))

        with create_connection(self.db_file) as conn:
            conn.execute(
                """
                INSERT INTO telemetry_events (
                    recorded_at,
                    event_name,
                    page,
                    path,
                    release_id,
                    environment,
                    source_channel,
                    session_id,
                    outcome,
                    reason,
                    payload_json,
                    forward_status,
                    forward_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    utc_now_iso(),
                    event_name,
                    str(payload.get("page", "")) or None,
                    str(payload.get("path", "")) or None,
                    release_id,
                    str(payload.get("environment", "")) or None,
                    str(payload.get("source_channel", "")) or None,
                    str(payload.get("session_id", "")) or None,
                    str(data.get("outcome", "")) or None,
                    str(data.get("reason", "")) or None,
                    json.dumps(payload, ensure_ascii=True),
                    forward_status,
                    forward_error,
                ),
            )

        if event_name == "external_data_sync_failed":
            self._create_basic_alerts(release_id)

    def _read_observability_summary(self, window_minutes: int) -> dict:
        cutoff = (datetime.now(tz=timezone.utc) - timedelta(minutes=window_minutes)).isoformat()
        with create_connection(self.db_file) as conn:
            release_rows = conn.execute(
                """
                SELECT
                    COALESCE(release_id, 'unknown') AS release_id,
                    COUNT(1) AS total_events,
                    SUM(CASE WHEN event_name = 'external_data_sync_failed' THEN 1 ELSE 0 END) AS sync_failures,
                    MAX(recorded_at) AS last_seen_at
                FROM telemetry_events
                WHERE recorded_at >= ?
                GROUP BY COALESCE(release_id, 'unknown')
                ORDER BY total_events DESC
                """,
                (cutoff,),
            ).fetchall()

            event_rows = conn.execute(
                """
                SELECT event_name, COUNT(1) AS total
                FROM telemetry_events
                WHERE recorded_at >= ?
                GROUP BY event_name
                ORDER BY total DESC
                """,
                (cutoff,),
            ).fetchall()

            forwarding = conn.execute(
                """
                SELECT
                    SUM(CASE WHEN forward_status = 'forwarded' THEN 1 ELSE 0 END) AS forwarded,
                    SUM(CASE WHEN forward_status = 'not_configured' THEN 1 ELSE 0 END) AS not_configured,
                    SUM(CASE WHEN forward_status LIKE 'forward_failed%' THEN 1 ELSE 0 END) AS failed
                FROM telemetry_events
                WHERE recorded_at >= ?
                """,
                (cutoff,),
            ).fetchone()

            total = conn.execute(
                """
                SELECT COUNT(1) AS total
                FROM telemetry_events
                WHERE recorded_at >= ?
                """,
                (cutoff,),
            ).fetchone()

        return {
            "windowMinutes": window_minutes,
            "totalEvents": int(total["total"] or 0),
            "byRelease": [
                {
                    "releaseId": row["release_id"],
                    "totalEvents": int(row["total_events"] or 0),
                    "syncFailures": int(row["sync_failures"] or 0),
                    "lastSeenAt": row["last_seen_at"],
                }
                for row in release_rows
            ],
            "byEvent": [
                {"event": row["event_name"], "total": int(row["total"] or 0)} for row in event_rows
            ],
            "forwarding": {
                "forwarded": int(forwarding["forwarded"] or 0),
                "notConfigured": int(forwarding["not_configured"] or 0),
                "failed": int(forwarding["failed"] or 0),
            },
        }

    def _read_observability_alerts(self, limit: int) -> list[dict]:
        with create_connection(self.db_file) as conn:
            rows = conn.execute(
                """
                SELECT created_at, alert_type, severity, release_id, message, details_json
                FROM observability_alerts
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        alerts = []
        for row in rows:
            try:
                details = json.loads(row["details_json"])
            except json.JSONDecodeError:
                details = {}

            alerts.append(
                {
                    "createdAt": row["created_at"],
                    "alertType": row["alert_type"],
                    "severity": row["severity"],
                    "releaseId": row["release_id"],
                    "message": row["message"],
                    "details": details,
                }
            )

        return alerts

    def _read_observability_health(self) -> dict:
        db_ok = True
        db_error = None
        latest_telemetry = None
        latest_alert = None
        telemetry_events_24h = 0
        alerts_24h = 0

        try:
            cutoff_24h = (datetime.now(tz=timezone.utc) - timedelta(hours=24)).isoformat()
            with create_connection(self.db_file) as conn:
                conn.execute("SELECT 1")

                telemetry_row = conn.execute(
                    """
                    SELECT recorded_at, release_id, event_name
                    FROM telemetry_events
                    ORDER BY id DESC
                    LIMIT 1
                    """
                ).fetchone()

                alert_row = conn.execute(
                    """
                    SELECT created_at, alert_type, severity, release_id
                    FROM observability_alerts
                    ORDER BY id DESC
                    LIMIT 1
                    """
                ).fetchone()

                telemetry_count_row = conn.execute(
                    """
                    SELECT COUNT(1) AS total
                    FROM telemetry_events
                    WHERE recorded_at >= ?
                    """,
                    (cutoff_24h,),
                ).fetchone()

                alerts_count_row = conn.execute(
                    """
                    SELECT COUNT(1) AS total
                    FROM observability_alerts
                    WHERE created_at >= ?
                    """,
                    (cutoff_24h,),
                ).fetchone()

                telemetry_events_24h = int(telemetry_count_row["total"] or 0)
                alerts_24h = int(alerts_count_row["total"] or 0)

                if telemetry_row:
                    latest_telemetry = {
                        "recordedAt": telemetry_row["recorded_at"],
                        "releaseId": telemetry_row["release_id"],
                        "event": telemetry_row["event_name"],
                    }

                if alert_row:
                    latest_alert = {
                        "createdAt": alert_row["created_at"],
                        "alertType": alert_row["alert_type"],
                        "severity": alert_row["severity"],
                        "releaseId": alert_row["release_id"],
                    }
        except Exception as error:  # nosec B110 - health endpoint must stay resilient
            db_ok = False
            db_error = str(error)

        return {
            "status": "ok" if db_ok else "degraded",
            "database": {
                "ok": db_ok,
                "error": db_error,
                "path": str(self.db_file),
            },
            "forwarding": {
                "configured": bool(self.telemetry_forward_url),
                "destination": self.telemetry_forward_url or None,
                "provider": self.telemetry_forward_provider,
                "authType": self.telemetry_forward_auth_type,
                "timeoutSeconds": self.telemetry_forward_timeout_seconds,
            },
            "alerts": {
                "rule": {
                    "failureThreshold": self.alert_failure_threshold,
                    "windowMinutes": self.alert_window_minutes,
                },
                "last": latest_alert,
                "countLast24h": alerts_24h,
            },
            "telemetry": {
                "last": latest_telemetry,
                "countLast24h": telemetry_events_24h,
            },
        }

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
        if (
            parsed_path.path == "/telemetry/events"
            or parsed_path.path.startswith("/compliance/")
            or parsed_path.path.startswith("/observability/")
        ):
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

            valid, validation_result = self._validate_telemetry_payload(result)
            if not valid:
                self._write_json(400, {"ok": False, **validation_result})
                return

            self._append_event(result)
            forward_status, forward_error = self._forward_telemetry(result)
            self._store_telemetry_event(result, forward_status=forward_status, forward_error=forward_error)
            self._write_json(202, {"ok": True, "forwardStatus": forward_status})
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

        if parsed_path.path == "/observability/summary":
            window_minutes = self._read_window_minutes_param(parsed_path, default=60, maximum=1440)
            summary = self._read_observability_summary(window_minutes)
            self._write_json(200, {"ok": True, "summary": summary})
            return

        if parsed_path.path == "/observability/alerts":
            limit = self._read_limit_param(parsed_path, default=20, maximum=200)
            self._write_json(200, {"ok": True, "alerts": self._read_observability_alerts(limit)})
            return

        if parsed_path.path == "/observability/health":
            health = self._read_observability_health()
            self._write_json(200, {"ok": True, "health": health})
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
        "--static-dir",
        default=str(DEFAULT_STATIC_DIR),
        help="Directory containing the static site to serve",
    )
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
    parser.add_argument(
        "--telemetry-forward-url",
        default=os.getenv("TELEMETRY_FORWARD_URL", ""),
        help="Optional HTTP endpoint to forward telemetry events",
    )
    parser.add_argument(
        "--telemetry-forward-provider",
        default=os.getenv("TELEMETRY_FORWARD_PROVIDER", "raw"),
        choices=["raw", "loki"],
        help="Forwarding payload format/provider",
    )
    parser.add_argument(
        "--telemetry-forward-auth-type",
        default=os.getenv("TELEMETRY_FORWARD_AUTH_TYPE", "none"),
        choices=["none", "bearer", "x-api-key", "basic"],
        help="Authentication mode for forwarding destination",
    )
    parser.add_argument(
        "--telemetry-forward-auth-token",
        default=os.getenv("TELEMETRY_FORWARD_AUTH_TOKEN", ""),
        help="Bearer token or API key for forwarding destination",
    )
    parser.add_argument(
        "--telemetry-forward-auth-header",
        default=os.getenv("TELEMETRY_FORWARD_AUTH_HEADER", "X-API-Key"),
        help="Header name used when auth type is x-api-key",
    )
    parser.add_argument(
        "--telemetry-forward-username",
        default=os.getenv("TELEMETRY_FORWARD_USERNAME", ""),
        help="Username used when auth type is basic",
    )
    parser.add_argument(
        "--telemetry-forward-password",
        default=os.getenv("TELEMETRY_FORWARD_PASSWORD", ""),
        help="Password used when auth type is basic",
    )
    parser.add_argument(
        "--telemetry-forward-timeout-seconds",
        type=int,
        default=int(os.getenv("TELEMETRY_FORWARD_TIMEOUT_SECONDS", str(DEFAULT_FORWARD_TIMEOUT_SECONDS))),
        help="Timeout in seconds for outbound forwarding requests",
    )
    parser.add_argument(
        "--alert-failure-threshold",
        type=int,
        default=DEFAULT_ALERT_FAILURE_THRESHOLD,
        help="Failure count threshold to open basic observability alerts",
    )
    parser.add_argument(
        "--alert-window-minutes",
        type=int,
        default=DEFAULT_ALERT_WINDOW_MINUTES,
        help="Time window in minutes used by basic alert rules",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    static_dir = Path(args.static_dir)
    log_file = Path(args.log_file)
    db_file = Path(args.db_file)
    init_database(db_file)

    if not static_dir.is_dir():
        raise SystemExit(
            f"Static site directory not found: {static_dir}. Run 'npm run deploy:build' or 'npm run nuxt:generate' first."
        )

    def handler(*handler_args, **handler_kwargs):
        return ConectaRequestHandler(
            *handler_args,
            static_dir=static_dir,
            log_file=log_file,
            db_file=db_file,
            telemetry_forward_url=args.telemetry_forward_url,
            telemetry_forward_provider=args.telemetry_forward_provider,
            telemetry_forward_auth_type=args.telemetry_forward_auth_type,
            telemetry_forward_auth_token=args.telemetry_forward_auth_token,
            telemetry_forward_auth_header=args.telemetry_forward_auth_header,
            telemetry_forward_username=args.telemetry_forward_username,
            telemetry_forward_password=args.telemetry_forward_password,
            telemetry_forward_timeout_seconds=args.telemetry_forward_timeout_seconds,
            alert_failure_threshold=args.alert_failure_threshold,
            alert_window_minutes=args.alert_window_minutes,
            **handler_kwargs,
        )

    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {static_dir} at http://{args.host}:{args.port}")
    print(f"Telemetry collector endpoint: http://{args.host}:{args.port}/telemetry/events")
    print(f"Telemetry log file: {log_file}")
    print(f"Compliance database file: {db_file}")
    if args.telemetry_forward_url:
        print(f"Telemetry forwarding destination: {args.telemetry_forward_url}")
        print(f"Telemetry forwarding provider: {args.telemetry_forward_provider}")
        print(f"Telemetry forwarding auth type: {args.telemetry_forward_auth_type}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
