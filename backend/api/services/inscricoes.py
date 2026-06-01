"""Service for normalized inscricoes lookup from the intermediate database."""

from __future__ import annotations

from datetime import datetime, timezone

from ..schemas import IngestBatchStatusResponse, InscricaoConsultaResponse
from ..storage import ensure_database_async, fetch_one_async


class InscricaoServiceError(Exception):
    """Base error for inscricoes lookup failures."""


class InscricaoNotFoundError(InscricaoServiceError):
    pass


class IngestBatchNotFoundError(InscricaoServiceError):
    pass


class InscricaoService:
    async def get_by_id(self, inscricao_id: str) -> InscricaoConsultaResponse:
        normalized_id = inscricao_id.strip().upper()
        if not normalized_id:
            raise InscricaoNotFoundError

        await ensure_database_async()
        row = await fetch_one_async(
            """
            SELECT id, status, data_atualizacao_origem
            FROM inscricoes
            WHERE id = ?
            """,
            (normalized_id,),
        )

        if row is None:
            raise InscricaoNotFoundError

        updated_at_raw = str(row["data_atualizacao_origem"])
        normalized_ts = updated_at_raw.replace("Z", "+00:00")
        parsed_updated_at = datetime.fromisoformat(normalized_ts)
        if parsed_updated_at.tzinfo is None:
            parsed_updated_at = parsed_updated_at.replace(tzinfo=timezone.utc)

        return InscricaoConsultaResponse(
            id=str(row["id"]),
            status=str(row["status"]),
            ultimaAtualizacao=parsed_updated_at.astimezone(timezone.utc),
        )

    async def get_batch_status(self, lote_importacao: str) -> IngestBatchStatusResponse:
        normalized_lote = lote_importacao.strip()
        if not normalized_lote:
            raise IngestBatchNotFoundError

        await ensure_database_async()
        row = await fetch_one_async(
            """
            SELECT lote_importacao,
                   status_lote,
                   checksum_arquivo,
                   total_linhas,
                   linhas_validas,
                   linhas_invalidas,
                   registros_inseridos,
                   registros_atualizados,
                   iniciado_em,
                   finalizado_em
            FROM ingest_batches
            WHERE lote_importacao = ?
            """,
            (normalized_lote,),
        )
        if row is None:
            raise IngestBatchNotFoundError

        started = datetime.fromisoformat(str(row["iniciado_em"]).replace("Z", "+00:00"))
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)

        finished_raw = row["finalizado_em"]
        finished = None
        if finished_raw:
            finished = datetime.fromisoformat(str(finished_raw).replace("Z", "+00:00"))
            if finished.tzinfo is None:
                finished = finished.replace(tzinfo=timezone.utc)

        return IngestBatchStatusResponse(
            loteImportacao=str(row["lote_importacao"]),
            statusLote=str(row["status_lote"]),
            checksumArquivo=str(row["checksum_arquivo"]),
            totalLinhas=int(row["total_linhas"]),
            linhasValidas=int(row["linhas_validas"]),
            linhasInvalidas=int(row["linhas_invalidas"]),
            registrosInseridos=int(row["registros_inseridos"]),
            registrosAtualizados=int(row["registros_atualizados"]),
            iniciadoEm=started.astimezone(timezone.utc),
            finalizadoEm=finished.astimezone(timezone.utc) if finished else None,
        )


def get_inscricao_service() -> InscricaoService:
    return InscricaoService()
