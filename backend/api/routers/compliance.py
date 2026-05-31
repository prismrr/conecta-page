"""Compliance endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from ..deps import get_app_settings
from ..schemas import ErrorResponse
from ..schemas_compliance import (
    ConsentRecordCreate,
    ConsentRecordResponse,
    ConsentRecordsResponse,
    ContentAuditEventCreate,
    ContentAuditEventsResponse,
    DSARDeleteResponse,
    DSARExportResponse,
    DSARRequestCreate,
    DSARRequestResponse,
    DSARRequestsResponse,
    DSARSecureDeleteRequest,
    IntegrationEventCreate,
    IntegrationSummaryResponse,
)
from ..services.compliance import ContentAuditService, ConsentService, DsarService, IntegrationService
from ..config import Settings


router = APIRouter(prefix="/compliance", tags=["compliance"])


def get_consent_service(settings: Settings = Depends(get_app_settings)) -> ConsentService:
    return ConsentService(settings)


def get_dsar_service(settings: Settings = Depends(get_app_settings)) -> DsarService:
    return DsarService(settings)


def get_content_audit_service(settings: Settings = Depends(get_app_settings)) -> ContentAuditService:
    return ContentAuditService(settings)


def get_integration_service(settings: Settings = Depends(get_app_settings)) -> IntegrationService:
    return IntegrationService(settings)


@router.post(
    "/consent-records",
    response_model=ConsentRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Persist consent record",
)
async def create_consent_record(
    payload: ConsentRecordCreate,
    service: ConsentService = Depends(get_consent_service),
) -> ConsentRecordResponse:
    result = await service.create_consent_record(payload)
    return ConsentRecordResponse(**result)


@router.get(
    "/consent-records",
    response_model=ConsentRecordsResponse,
    summary="List consent records",
)
async def list_consent_records(
    limit: int = Query(default=20, ge=1, le=200),
    service: ConsentService = Depends(get_consent_service),
) -> ConsentRecordsResponse:
    records = await service.list_consent_records(limit)
    return ConsentRecordsResponse(ok=True, records=records)


@router.post(
    "/dsar-requests",
    response_model=DSARRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register DSAR request",
)
async def create_dsar_request(
    payload: DSARRequestCreate,
    service: DsarService = Depends(get_dsar_service),
) -> DSARRequestResponse:
    try:
        return await service.create_request(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get(
    "/dsar-requests",
    response_model=DSARRequestsResponse,
    summary="List DSAR requests",
)
async def list_dsar_requests(
    limit: int = Query(default=20, ge=1, le=200),
    service: DsarService = Depends(get_dsar_service),
) -> DSARRequestsResponse:
    return await service.list_requests(limit)


@router.post(
    "/dsar-requests/{protocol}/export",
    response_model=DSARExportResponse,
    summary="Export DSAR package",
)
async def export_dsar_request(
    protocol: str = Path(min_length=1, max_length=80),
    service: DsarService = Depends(get_dsar_service),
) -> DSARExportResponse:
    try:
        return await service.export_request(protocol)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="request_not_found") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="request_deleted") from exc


@router.post(
    "/dsar-requests/{protocol}/secure-delete",
    response_model=DSARDeleteResponse,
    summary="Secure delete DSAR export",
)
async def secure_delete_dsar_request(
    payload: DSARSecureDeleteRequest | None = None,
    protocol: str = Path(min_length=1, max_length=80),
    service: DsarService = Depends(get_dsar_service),
) -> DSARDeleteResponse:
    try:
        return await service.secure_delete_request(protocol, payload)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="request_not_found") from exc


@router.post(
    "/integration-events",
    response_model=ConsentRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Persist integration event",
)
async def create_integration_event(
    payload: IntegrationEventCreate,
    service: IntegrationService = Depends(get_integration_service),
) -> ConsentRecordResponse:
    result = await service.create_event(payload)
    return ConsentRecordResponse(**result)


@router.get(
    "/integration-summary",
    response_model=IntegrationSummaryResponse,
    summary="Read integration summary",
)
async def read_integration_summary(
    service: IntegrationService = Depends(get_integration_service),
) -> IntegrationSummaryResponse:
    return await service.read_summary()


@router.post(
    "/content-audit-events",
    response_model=ConsentRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Persist content audit event",
)
async def create_content_audit_event(
    payload: ContentAuditEventCreate,
    service: ContentAuditService = Depends(get_content_audit_service),
) -> ConsentRecordResponse:
    try:
        result = await service.create_event(payload)
        return ConsentRecordResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get(
    "/content-audit-events",
    response_model=ContentAuditEventsResponse,
    summary="List content audit events",
)
async def list_content_audit_events(
    limit: int = Query(default=50, ge=1, le=500),
    service: ContentAuditService = Depends(get_content_audit_service),
) -> ContentAuditEventsResponse:
    events = await service.list_events(limit)
    return ContentAuditEventsResponse(ok=True, events=events)
