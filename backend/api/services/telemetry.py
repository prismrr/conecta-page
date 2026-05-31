"""Telemetry persistence service."""

from __future__ import annotations

import json

from ..config import Settings
from ..schemas_telemetry import TelemetryEventCreate, TelemetryEventResponse
from ..storage import DEFAULT_DB_FILE, execute_async, fetch_all_async, fetch_one_async, ensure_database_async, utc_now_iso


class TelemetryService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def create_event(self, payload: TelemetryEventCreate) -> TelemetryEventResponse:
        await ensure_database_async()
        data = payload.data if isinstance(payload.data, dict) else {}

        await execute_async(
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
                payload.event,
                payload.page,
                payload.path,
                payload.release_id,
                payload.environment,
                payload.source_channel,
                payload.session_id,
                str(data.get("outcome", "")) or None,
                str(data.get("reason", "")) or None,
                json.dumps(payload.model_dump(mode="json"), ensure_ascii=True),
                "not_configured",
                None,
            ),
            db_file=DEFAULT_DB_FILE,
        )

        return TelemetryEventResponse(ok=True, forwardStatus="not_configured")
