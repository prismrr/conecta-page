"""Registration result endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, status

from ..schemas import ErrorResponse, RegistrationResultResponse
from ..services.registrations import (
    ProviderContractMismatchError,
    ProviderUnavailableError,
    RegistrationNotFoundError,
    RegistrationService,
    RegistrationUnauthorizedError,
    get_registration_service,
)


router = APIRouter(prefix="/api", tags=["registrations"])


@router.get(
    "/registrations/{registration_id}",
    response_model=RegistrationResultResponse,
    summary="Get registration result by identifier",
    description="Busca o resultado oficial de inscricao usando validacao tipada e erro padronizado.",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized access to provider"},
        403: {"model": ErrorResponse, "description": "Forbidden access to provider"},
        404: {"model": ErrorResponse, "description": "Registration ID not found"},
        503: {"model": ErrorResponse, "description": "Provider unavailable"},
    },
)
async def get_registration_result(
    registration_id: str = Path(min_length=3, max_length=64),
    service: RegistrationService = Depends(get_registration_service),
) -> RegistrationResultResponse:
    try:
        return await service.get_result(registration_id)
    except RegistrationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found") from exc
    except RegistrationUnauthorizedError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized") from exc
    except ProviderUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="provider_unavailable") from exc
    except ProviderContractMismatchError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="provider_unavailable") from exc
