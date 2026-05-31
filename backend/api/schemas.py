"""Pydantic v2 schemas for requests and responses."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictStr


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class HealthResponse(CamelModel):
    ok: Literal[True] = True


class ErrorResponse(CamelModel):
    ok: Literal[False] = False
    error: StrictStr


class RegistrationResultResponse(CamelModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    registration_id: StrictStr = Field(alias="registrationId", min_length=3, max_length=64)
    status: Literal["APPROVED", "UNDER_REVIEW", "REJECTED"]
    updated_at: datetime = Field(alias="updatedAt")
    detail: str | None = None
