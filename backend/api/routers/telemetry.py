"""Telemetry endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from ..config import Settings
from ..deps import get_app_settings
from ..schemas_telemetry import TelemetryEventCreate, TelemetryEventResponse
from ..services.telemetry import TelemetryService


router = APIRouter(prefix="/telemetry", tags=["telemetry"])


def get_telemetry_service(settings: Settings = Depends(get_app_settings)) -> TelemetryService:
    return TelemetryService(settings)


@router.post(
    "/events",
    response_model=TelemetryEventResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Receive telemetry event",
    description="Persiste evento de telemetria com camada de persistencia async.",
)
async def create_telemetry_event(
    payload: TelemetryEventCreate,
    service: TelemetryService = Depends(get_telemetry_service),
) -> TelemetryEventResponse:
    return await service.create_event(payload)
