"""Compliance and observability services for the FastAPI migration."""

from __future__ import annotations

import asyncio
import hashlib
import http.client
import json
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from ..config import Settings
from ..schemas_compliance import (
    ConsentRecordCreate,
    ConsentRecordItem,
    ContentAuditEventCreate,
    ContentAuditEventItem,
    DSARDeleteResponse,
    DSARExportResponse,
    DSARRequestCreate,
    DSARRequestItem,
    DSARRequestResponse,
    DSARRequestsResponse,
    DSARSecureDeleteRequest,
    IntegrationEventCreate,
    IntegrationSummary,
    IntegrationSummaryResponse,
    ObservabilityAlertItem,
    ObservabilityAlertsResponse,
    ObservabilityHealthResponse,
    ObservabilitySummary,
    ObservabilitySummaryResponse,
)
from .registrations import RegistrationServiceError
from ..storage import (
    DEFAULT_DB_FILE,
    DEFAULT_DSAR_EXPORT_DIR,
    create_connection,
    ensure_database,
    ensure_database_async,
    execute_async,
    fetch_all_async,
    fetch_one_async,
    utc_now_iso,
)


DEFAULT_ALERT_FAILURE_THRESHOLD = 3
DEFAULT_ALERT_WINDOW_MINUTES = 15


class ComplianceServiceError(RegistrationServiceError):
    pass


class ConsentService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def create_consent_record(self, payload: ConsentRecordCreate) -> dict[str, object]:
        await ensure_database_async()
        categories = payload.categories.model_dump(mode="python")
        safe_categories = {
            "essential": bool(categories.get("essential", True)),
            "analytics_optional": bool(categories.get("analytics_optional", False)),
            "marketing_optional": bool(categories.get("marketing_optional", False)),
            "communication_optional": bool(categories.get("marketing_optional", False)),
        }
        updated_at = payload.updated_at
        source = payload.source
        status = payload.status

        await execute_async(
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
            (utc_now_iso(), payload.version, updated_at, source, status, json.dumps(safe_categories, ensure_ascii=True)),
        )
        return {"ok": True}

    async def list_consent_records(self, limit: int) -> list[ConsentRecordItem]:
        await ensure_database_async()
        rows = await fetch_all_async(
            """
            SELECT recorded_at, version, updated_at, source, status, categories_json
            FROM consent_records
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )

        items: list[ConsentRecordItem] = []
        for row in rows:
            try:
                categories = json.loads(row["categories_json"])
            except json.JSONDecodeError:
                categories = {}

            items.append(
                ConsentRecordItem(
                    recordedAt=row["recorded_at"],
                    version=row["version"],
                    updatedAt=row["updated_at"],
                    source=row["source"],
                    status=row["status"],
                    categories=categories,
                )
            )
        return items


class DsarService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _create_protocol(self) -> str:
        y = datetime.now(tz=timezone.utc).strftime("%Y%m%d")
        suffix = secrets.token_hex(3).upper()
        return f"DSAR-{y}-{suffix}"

    def _hash_optional_text(self, value: Optional[str]) -> Optional[str]:
        normalized = (value or "").strip()
        if not normalized:
            return None
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    async def create_request(self, payload: DSARRequestCreate) -> DSARRequestResponse:
        await ensure_database_async()
        request_type = payload.request_type.strip().lower()
        if request_type not in {"acesso", "correcao", "exclusao", "exportacao", "revogacao_consentimento"}:
            raise ValueError("invalid_request_type")

        protocol = self._create_protocol()
        source = payload.source or "web_form"
        details_hash = self._hash_optional_text(payload.details)

        await execute_async(
            """
            INSERT INTO dsar_requests (
                protocol,
                requested_at,
                request_type,
                source,
                status,
                details_hash,
                exported_at,
                deleted_at,
                deletion_reason
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
            """,
            (protocol, utc_now_iso(), request_type, source, "received", details_hash),
        )
        return DSARRequestResponse(
            protocol=protocol,
            requestType=request_type,
            status="received",
            requestedAt=utc_now_iso(),
            message="Solicitacao DSAR recebida. Exportacao e exclusao segura ficam disponiveis via rotina operacional.",
        )

    async def list_requests(self, limit: int) -> DSARRequestsResponse:
        await ensure_database_async()
        rows = await fetch_all_async(
            """
            SELECT protocol, requested_at, request_type, source, status, details_hash, export_path, export_hash, exported_at, deleted_at, deletion_reason
            FROM dsar_requests
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )

        requests = [
            DSARRequestItem(
                protocol=row["protocol"],
                requestedAt=row["requested_at"],
                requestType=row["request_type"],
                source=row["source"],
                status=row["status"],
                detailsHash=row["details_hash"],
                exportPath=row["export_path"],
                exportHash=row["export_hash"],
                exportedAt=row["exported_at"],
                deletedAt=row["deleted_at"],
                deletionReason=row["deletion_reason"],
            )
            for row in rows
        ]
        return DSARRequestsResponse(requests=requests)

    async def export_request(self, protocol: str) -> DSARExportResponse:
        await ensure_database_async()
        request_row = await fetch_one_async(
            """
            SELECT protocol, requested_at, request_type, source, status, details_hash, export_path, export_hash, exported_at, deleted_at, deletion_reason
            FROM dsar_requests
            WHERE protocol = ?
            """,
            (protocol,),
        )

        if not request_row:
            raise FileNotFoundError("request_not_found")
        if str(request_row["deleted_at"] or "").strip():
            raise RuntimeError("request_deleted")

        bundle = {
            "protocol": request_row["protocol"],
            "requestedAt": request_row["requested_at"],
            "requestType": request_row["request_type"],
            "source": request_row["source"],
            "status": request_row["status"],
            "detailsHash": request_row["details_hash"],
            "exportedAt": utc_now_iso(),
        }
        export_dir = DEFAULT_DSAR_EXPORT_DIR
        export_dir.mkdir(parents=True, exist_ok=True)
        export_path = export_dir / f"{protocol}.json"
        export_payload = json.dumps(bundle, ensure_ascii=True, indent=2)
        export_path.write_text(export_payload, encoding="utf-8")
        export_hash = hashlib.sha256(export_payload.encode("utf-8")).hexdigest()

        await execute_async(
            """
            UPDATE dsar_requests
            SET status = ?, export_path = ?, export_hash = ?, exported_at = ?
            WHERE protocol = ?
            """,
            ("exported", str(export_path), export_hash, bundle["exportedAt"], protocol),
        )

        return DSARExportResponse(
            protocol=protocol,
            status="exported",
            exportPath=str(export_path),
            exportHash=export_hash,
            bundle=bundle,
        )

    async def secure_delete_request(self, protocol: str, payload: Optional[DSARSecureDeleteRequest] = None) -> DSARDeleteResponse:
        await ensure_database_async()
        reason = (payload.reason if payload else None) or "fulfilled_request"
        request_row = await fetch_one_async(
            """
            SELECT protocol, export_path, export_hash
            FROM dsar_requests
            WHERE protocol = ?
            """,
            (protocol,),
        )

        if not request_row:
            raise FileNotFoundError("request_not_found")

        export_path = str(request_row["export_path"] or "").strip()
        export_hash = str(request_row["export_hash"] or "").strip() or None
        deleted_export = False
        if export_path:
            path = Path(export_path)
            if path.exists():
                path.unlink()
                deleted_export = True

        deleted_at = utc_now_iso()
        await execute_async(
            """
            UPDATE dsar_requests
            SET status = ?, export_path = NULL, export_hash = NULL, deleted_at = ?, deletion_reason = ?
            WHERE protocol = ?
            """,
            ("deleted", deleted_at, reason, protocol),
        )

        return DSARDeleteResponse(
            protocol=protocol,
            status="deleted",
            deletedAt=deleted_at,
            deletedExport=deleted_export,
            exportHash=export_hash,
            deletionReason=reason,
        )


class ContentAuditService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def create_event(self, payload: ContentAuditEventCreate) -> dict[str, object]:
        await asyncio.to_thread(ensure_database)

        def _write() -> None:
            with create_connection(DEFAULT_DB_FILE) as conn:
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
                        payload.event_id,
                        payload.changed_at,
                        payload.content_domain,
                        payload.content_title,
                        payload.version,
                        payload.author,
                        payload.change_summary,
                        payload.change_type,
                        utc_now_iso(),
                    ),
                )

        try:
            await asyncio.to_thread(_write)
        except sqlite3.IntegrityError as exc:
            raise ValueError("event_id_already_exists") from exc

        return {"ok": True}

    async def list_events(self, limit: int) -> list[ContentAuditEventItem]:
        await asyncio.to_thread(ensure_database)

        def _read() -> list[ContentAuditEventItem]:
            with create_connection(DEFAULT_DB_FILE) as conn:
                rows = conn.execute(
                    """
                    SELECT event_id, changed_at, content_domain, content_title, version, author, change_summary, change_type
                    FROM content_audit_events
                    ORDER BY changed_at DESC, id DESC
                    LIMIT ?
                    """,
                    (limit,),
                ).fetchall()

            return [
                ContentAuditEventItem(
                    eventId=row["event_id"],
                    changedAt=row["changed_at"],
                    contentDomain=row["content_domain"],
                    contentTitle=row["content_title"],
                    version=row["version"],
                    author=row["author"],
                    changeSummary=row["change_summary"],
                    changeType=row["change_type"],
                )
                for row in rows
            ]

        return await asyncio.to_thread(_read)


class IntegrationService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def create_event(self, payload: IntegrationEventCreate) -> dict[str, object]:
        await asyncio.to_thread(ensure_database)

        def _write() -> None:
            with create_connection(DEFAULT_DB_FILE) as conn:
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
                    (utc_now_iso(), payload.outcome, payload.signal, payload.detail, payload.source_page),
                )

        await asyncio.to_thread(_write)
        return {"ok": True}

    async def read_summary(self) -> IntegrationSummaryResponse:
        await asyncio.to_thread(ensure_database)

        def _read() -> IntegrationSummaryResponse:
            with create_connection(DEFAULT_DB_FILE) as conn:
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

            summary = IntegrationSummary(
                totalChecks=int(totals["total_checks"] or 0),
                availableChecks=int(totals["available_checks"] or 0),
                degradedChecks=int(totals["degraded_checks"] or 0),
                providerFailures=int(totals["provider_failures"] or 0),
                lastEvent=(
                    {
                        "recordedAt": latest["recorded_at"],
                        "outcome": latest["outcome"],
                        "signal": latest["signal"],
                        "detail": latest["detail"] or "Sem detalhe adicional.",
                    }
                    if latest
                    else None
                ),
            )
            return IntegrationSummaryResponse(ok=True, summary=summary)

        return await asyncio.to_thread(_read)


class ObservabilityService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def read_summary(self, window_minutes: int) -> ObservabilitySummaryResponse:
        await asyncio.to_thread(ensure_database)

        def _read() -> ObservabilitySummaryResponse:
            cutoff = (datetime.now(tz=timezone.utc) - timedelta(minutes=window_minutes)).isoformat()
            with create_connection(DEFAULT_DB_FILE) as conn:
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

            summary = ObservabilitySummary(
                windowMinutes=window_minutes,
                totalEvents=int(total["total"] or 0),
                byRelease=[
                    {
                        "releaseId": row["release_id"],
                        "totalEvents": int(row["total_events"] or 0),
                        "syncFailures": int(row["sync_failures"] or 0),
                        "lastSeenAt": row["last_seen_at"],
                    }
                    for row in release_rows
                ],
                byEvent=[{"event": row["event_name"], "total": int(row["total"] or 0)} for row in event_rows],
                forwarding={
                    "forwarded": int(forwarding["forwarded"] or 0),
                    "notConfigured": int(forwarding["not_configured"] or 0),
                    "failed": int(forwarding["failed"] or 0),
                },
            )
            return ObservabilitySummaryResponse(ok=True, summary=summary)

        return await asyncio.to_thread(_read)

    async def read_alerts(self, limit: int) -> ObservabilityAlertsResponse:
        await asyncio.to_thread(ensure_database)

        def _read() -> ObservabilityAlertsResponse:
            with create_connection(DEFAULT_DB_FILE) as conn:
                rows = conn.execute(
                    """
                    SELECT created_at, alert_type, severity, release_id, message, details_json
                    FROM observability_alerts
                    ORDER BY id DESC
                    LIMIT ?
                    """,
                    (limit,),
                ).fetchall()

            alerts: list[ObservabilityAlertItem] = []
            for row in rows:
                try:
                    details = json.loads(row["details_json"])
                except json.JSONDecodeError:
                    details = {}
                alerts.append(
                    ObservabilityAlertItem(
                        createdAt=row["created_at"],
                        alertType=row["alert_type"],
                        severity=row["severity"],
                        releaseId=row["release_id"],
                        message=row["message"],
                        details=details,
                    )
                )
            return ObservabilityAlertsResponse(ok=True, alerts=alerts)

        return await asyncio.to_thread(_read)

    async def read_health(self) -> ObservabilityHealthResponse:
        await asyncio.to_thread(ensure_database)

        def _read() -> ObservabilityHealthResponse:
            db_ok = True
            db_error = None
            latest_telemetry = None
            latest_alert = None
            telemetry_events_24h = 0
            alerts_24h = 0

            try:
                cutoff_24h = (datetime.now(tz=timezone.utc) - timedelta(hours=24)).isoformat()
                with create_connection(DEFAULT_DB_FILE) as conn:
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

            health = {
                "status": "ok" if db_ok else "degraded",
                "database": {"ok": db_ok, "error": db_error, "path": str(DEFAULT_DB_FILE)},
                "forwarding": {
                    "configured": False,
                    "destination": None,
                    "provider": "raw",
                    "authType": "none",
                    "timeoutSeconds": 3,
                },
                "alerts": {
                    "rule": {"failureThreshold": DEFAULT_ALERT_FAILURE_THRESHOLD, "windowMinutes": DEFAULT_ALERT_WINDOW_MINUTES},
                    "last": latest_alert,
                    "countLast24h": alerts_24h,
                },
                "telemetry": {"last": latest_telemetry, "countLast24h": telemetry_events_24h},
            }
            return ObservabilityHealthResponse(ok=True, health=health)

        return await asyncio.to_thread(_read)
