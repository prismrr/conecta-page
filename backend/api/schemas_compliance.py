"""Compliance schemas for the FastAPI migration."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictStr

from .schemas import CamelModel, ErrorResponse


class ConsentCategories(CamelModel):
    essential: StrictBool = True
    analytics_optional: StrictBool = False
    marketing_optional: StrictBool = False


class ConsentRecordCreate(CamelModel):
    version: StrictStr = Field(min_length=1, max_length=64)
    updated_at: str | None = Field(default=None, alias="updatedAt")
    source: str | None = None
    status: Literal["granted", "revoked"]
    categories: ConsentCategories


class ConsentRecordItem(CamelModel):
    recorded_at: datetime = Field(alias="recordedAt")
    version: StrictStr
    updated_at: str | None = Field(default=None, alias="updatedAt")
    source: str | None = None
    status: Literal["granted", "revoked"]
    categories: dict[str, object]


class ConsentRecordsResponse(CamelModel):
    ok: Literal[True] = True
    records: list[ConsentRecordItem]


class ConsentRecordResponse(CamelModel):
    ok: Literal[True] = True


class IntegrationEventCreate(CamelModel):
    outcome: StrictStr = Field(min_length=1, max_length=128)
    signal: Literal["available", "degraded", "unavailable", "unknown"]
    detail: str | None = None
    source_page: str | None = Field(default=None, alias="sourcePage")


class IntegrationSummaryLastEvent(CamelModel):
    recorded_at: datetime = Field(alias="recordedAt")
    outcome: StrictStr
    signal: StrictStr
    detail: str


class IntegrationSummary(CamelModel):
    total_checks: int = Field(alias="totalChecks")
    available_checks: int = Field(alias="availableChecks")
    degraded_checks: int = Field(alias="degradedChecks")
    provider_failures: int = Field(alias="providerFailures")
    last_event: IntegrationSummaryLastEvent | None = Field(default=None, alias="lastEvent")


class IntegrationSummaryResponse(CamelModel):
    ok: Literal[True] = True
    summary: IntegrationSummary


class DSARRequestCreate(CamelModel):
    request_type: StrictStr = Field(alias="requestType", min_length=1, max_length=64)
    details: str | None = None
    source: str | None = None


class DSARRequestItem(CamelModel):
    protocol: StrictStr
    requested_at: datetime = Field(alias="requestedAt")
    request_type: StrictStr = Field(alias="requestType")
    source: str | None = None
    status: StrictStr
    details_hash: str | None = Field(default=None, alias="detailsHash")
    export_path: str | None = Field(default=None, alias="exportPath")
    export_hash: str | None = Field(default=None, alias="exportHash")
    exported_at: datetime | None = Field(default=None, alias="exportedAt")
    deleted_at: datetime | None = Field(default=None, alias="deletedAt")
    deletion_reason: str | None = Field(default=None, alias="deletionReason")


class DSARRequestsResponse(CamelModel):
    ok: Literal[True] = True
    requests: list[DSARRequestItem]


class DSARRequestResponse(CamelModel):
    ok: Literal[True] = True
    protocol: StrictStr
    request_type: StrictStr = Field(alias="requestType")
    status: StrictStr
    requested_at: datetime = Field(alias="requestedAt")
    message: StrictStr


class DSARExportResponse(CamelModel):
    ok: Literal[True] = True
    protocol: StrictStr
    status: StrictStr
    export_path: str = Field(alias="exportPath")
    export_hash: str = Field(alias="exportHash")
    bundle: dict[str, object] | None = None


class DSARSecureDeleteRequest(CamelModel):
    reason: str | None = None


class DSARDeleteResponse(CamelModel):
    ok: Literal[True] = True
    protocol: StrictStr
    status: StrictStr
    deleted_at: datetime = Field(alias="deletedAt")
    deleted_export: StrictBool = Field(alias="deletedExport")
    export_hash: str | None = Field(default=None, alias="exportHash")
    deletion_reason: str | None = Field(default=None, alias="deletionReason")


class ContentAuditEventCreate(CamelModel):
    event_id: StrictStr = Field(alias="eventId", min_length=1, max_length=64)
    changed_at: StrictStr = Field(alias="changedAt", min_length=1, max_length=64)
    content_domain: StrictStr = Field(alias="contentDomain", min_length=1, max_length=64)
    content_title: StrictStr = Field(alias="contentTitle", min_length=1, max_length=128)
    version: StrictStr = Field(min_length=1, max_length=64)
    author: StrictStr = Field(min_length=1, max_length=128)
    change_summary: StrictStr = Field(alias="changeSummary", min_length=1, max_length=280)
    change_type: StrictStr = Field(alias="changeType", min_length=1, max_length=64)


class ContentAuditEventItem(CamelModel):
    event_id: StrictStr = Field(alias="eventId")
    changed_at: StrictStr = Field(alias="changedAt")
    content_domain: StrictStr = Field(alias="contentDomain")
    content_title: StrictStr = Field(alias="contentTitle")
    version: StrictStr
    author: StrictStr
    change_summary: StrictStr = Field(alias="changeSummary")
    change_type: StrictStr = Field(alias="changeType")


class ContentAuditEventsResponse(CamelModel):
    ok: Literal[True] = True
    events: list[ContentAuditEventItem]


class HealthSummary(CamelModel):
    status: StrictStr
    database: dict[str, object]
    forwarding: dict[str, object]
    alerts: dict[str, object]
    telemetry: dict[str, object]


class ObservabilityHealthResponse(CamelModel):
    ok: Literal[True] = True
    health: HealthSummary


class ObservabilitySummaryByReleaseItem(CamelModel):
    release_id: StrictStr = Field(alias="releaseId")
    total_events: int = Field(alias="totalEvents")
    sync_failures: int = Field(alias="syncFailures")
    last_seen_at: str | None = Field(default=None, alias="lastSeenAt")


class ObservabilitySummaryByEventItem(CamelModel):
    event: StrictStr
    total: int


class ObservabilityForwardingSummary(CamelModel):
    forwarded: int
    not_configured: int = Field(alias="notConfigured")
    failed: int


class ObservabilitySummary(CamelModel):
    window_minutes: int = Field(alias="windowMinutes")
    total_events: int = Field(alias="totalEvents")
    by_release: list[ObservabilitySummaryByReleaseItem] = Field(alias="byRelease")
    by_event: list[ObservabilitySummaryByEventItem] = Field(alias="byEvent")
    forwarding: ObservabilityForwardingSummary


class ObservabilitySummaryResponse(CamelModel):
    ok: Literal[True] = True
    summary: ObservabilitySummary


class ObservabilityAlertItem(CamelModel):
    created_at: datetime = Field(alias="createdAt")
    alert_type: StrictStr = Field(alias="alertType")
    severity: StrictStr
    release_id: str | None = Field(default=None, alias="releaseId")
    message: StrictStr
    details: dict[str, object]


class ObservabilityAlertsResponse(CamelModel):
    ok: Literal[True] = True
    alerts: list[ObservabilityAlertItem]
