"""Inscricoes endpoints backed by the intermediate data store."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, status

from ..schemas import ErrorResponse, IngestBatchStatusResponse, InscricaoConsultaResponse
from ..services.inscricoes import (
    IngestBatchNotFoundError,
    InscricaoNotFoundError,
    InscricaoService,
    get_inscricao_service,
)


router = APIRouter(prefix="/api/inscricoes", tags=["inscricoes"])


@router.get(
    "/{inscricao_id}",
    response_model=InscricaoConsultaResponse,
    summary="Get normalized inscricao by identifier",
    description=(
        "Consulta a inscricao normalizada no banco intermediario sem depender da disponibilidade da origem CSV."
    ),
    responses={
        404: {"model": ErrorResponse, "description": "Inscricao nao encontrada"},
        422: {"model": ErrorResponse, "description": "Identificador invalido"},
    },
)
async def get_inscricao(
    inscricao_id: str = Path(min_length=3, max_length=64),
    service: InscricaoService = Depends(get_inscricao_service),
) -> InscricaoConsultaResponse:
    try:
        return await service.get_by_id(inscricao_id)
    except InscricaoNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found") from exc


@router.get(
    "/lotes/{lote_importacao}",
    response_model=IngestBatchStatusResponse,
    summary="Get ingestion batch status",
    description="Consulta o status operacional e as metricas do lote de ingestao no banco intermediario.",
    responses={
        404: {"model": ErrorResponse, "description": "Lote nao encontrado"},
        422: {"model": ErrorResponse, "description": "Identificador de lote invalido"},
    },
)
async def get_ingestion_batch(
    lote_importacao: str = Path(min_length=3, max_length=80),
    service: InscricaoService = Depends(get_inscricao_service),
) -> IngestBatchStatusResponse:
    try:
        return await service.get_batch_status(lote_importacao)
    except IngestBatchNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="batch_not_found") from exc
