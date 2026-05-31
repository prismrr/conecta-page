"""Observability endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..config import Settings
from ..deps import get_app_settings
from ..schemas_compliance import ObservabilityAlertsResponse, ObservabilityHealthResponse, ObservabilitySummaryResponse
from ..services.compliance import ObservabilityService


router = APIRouter(prefix="/observability", tags=["observability"])


def get_observability_service(settings: Settings = Depends(get_app_settings)) -> ObservabilityService:
    return ObservabilityService(settings)


@router.get("/summary", response_model=ObservabilitySummaryResponse, summary="Read observability summary")
async def read_summary(
    window_minutes: int = Query(default=60, ge=1, le=1440, alias="windowMinutes"),
    service: ObservabilityService = Depends(get_observability_service),
) -> ObservabilitySummaryResponse:
    return await service.read_summary(window_minutes)


@router.get("/alerts", response_model=ObservabilityAlertsResponse, summary="List observability alerts")
async def read_alerts(
    limit: int = Query(default=20, ge=1, le=200),
    service: ObservabilityService = Depends(get_observability_service),
) -> ObservabilityAlertsResponse:
    return await service.read_alerts(limit)


@router.get("/health", response_model=ObservabilityHealthResponse, summary="Read observability health")
async def read_health(service: ObservabilityService = Depends(get_observability_service)) -> ObservabilityHealthResponse:
    return await service.read_health()
