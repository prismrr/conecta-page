"""Registration result service."""

from __future__ import annotations

from datetime import datetime, timezone

from ..schemas import RegistrationResultResponse


class RegistrationServiceError(Exception):
    """Base error for registration lookup failures."""


class RegistrationNotFoundError(RegistrationServiceError):
    pass


class RegistrationUnauthorizedError(RegistrationServiceError):
    pass


class ProviderUnavailableError(RegistrationServiceError):
    pass


class ProviderContractMismatchError(RegistrationServiceError):
    pass


class RegistrationService:
    async def get_result(self, registration_id: str) -> RegistrationResultResponse:
        normalized_id = registration_id.strip().upper()
        if not normalized_id:
            raise RegistrationNotFoundError

        if normalized_id.endswith("404"):
            raise RegistrationNotFoundError

        if normalized_id.endswith("401"):
            raise RegistrationUnauthorizedError

        if normalized_id.endswith("503"):
            raise ProviderUnavailableError

        if normalized_id.endswith("999"):
            raise ProviderContractMismatchError

        numeric_tail = "".join(ch for ch in normalized_id if ch.isdigit())
        last_digit = int(numeric_tail[-1]) if numeric_tail else 0

        if last_digit in {1, 3, 5, 7}:
            status = "APPROVED"
            detail = "Classificado para a trilha principal"
        elif last_digit == 9:
            status = "REJECTED"
            detail = "Nao classificado nesta rodada"
        else:
            status = "UNDER_REVIEW"
            detail = "Avaliacao em andamento"

        return RegistrationResultResponse(
            registrationId=normalized_id,
            status=status,
            updatedAt=datetime.now(tz=timezone.utc),
            detail=detail,
        )


def get_registration_service() -> RegistrationService:
    return RegistrationService()
