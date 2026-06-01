"""Pydantic v2 schemas for requests and responses."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

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
    detail: Optional[str] = None


class InscricaoConsultaResponse(CamelModel):
    id: StrictStr
    status: Literal["APROVADO", "EM_ANALISE", "REPROVADO"]
    ultima_atualizacao: datetime = Field(alias="ultimaAtualizacao")


class IngestBatchStatusResponse(CamelModel):
    lote_importacao: StrictStr = Field(alias="loteImportacao")
    status_lote: StrictStr = Field(alias="statusLote")
    checksum_arquivo: StrictStr = Field(alias="checksumArquivo")
    total_linhas: int = Field(alias="totalLinhas", ge=0)
    linhas_validas: int = Field(alias="linhasValidas", ge=0)
    linhas_invalidas: int = Field(alias="linhasInvalidas", ge=0)
    registros_inseridos: int = Field(alias="registrosInseridos", ge=0)
    registros_atualizados: int = Field(alias="registrosAtualizados", ge=0)
    iniciado_em: datetime = Field(alias="iniciadoEm")
    finalizado_em: Optional[datetime] = Field(default=None, alias="finalizadoEm")
