"""Health endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..config import Settings
from ..deps import get_app_settings
from ..schemas import HealthResponse


router = APIRouter(tags=["health"])


@router.get(
    "/healthz",
    response_model=HealthResponse,
    summary="Health check",
    description="Verifica disponibilidade basica da API FastAPI.",
)
async def healthz(_: Settings = Depends(get_app_settings)) -> HealthResponse:
    return HealthResponse(ok=True)
