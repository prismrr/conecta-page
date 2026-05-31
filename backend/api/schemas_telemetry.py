"""Telemetry schemas for the FastAPI migration."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field, StrictStr

from .schemas import CamelModel


class TelemetryEventData(CamelModel):
    pass


class TelemetryEventCreate(CamelModel):
    event: StrictStr = Field(min_length=1, max_length=128)
    timestamp: datetime
    page: StrictStr = Field(min_length=1, max_length=128)
    path: StrictStr = Field(min_length=1, max_length=256)
    release_id: StrictStr = Field(alias="release_id", min_length=1, max_length=128)
    environment: StrictStr = Field(min_length=1, max_length=64)
    source_channel: StrictStr = Field(alias="source_channel", min_length=1, max_length=64)
    session_id: StrictStr = Field(alias="session_id", min_length=1, max_length=128)
    data: dict[str, object]


class TelemetryEventResponse(CamelModel):
    ok: Literal[True] = True
    forward_status: StrictStr = Field(alias="forwardStatus")
