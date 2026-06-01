"""Celery tasks for CSV ingestion and incremental synchronization."""

from __future__ import annotations

import csv
import hashlib
import http.client
import io
import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse

from cryptography.fernet import Fernet

from .celery_app import celery_app
from ..api.sqlite_utils import create_connection, init_database, utc_now_iso
from ..api.storage import DEFAULT_DB_FILE


REQUIRED_COLUMNS = {
    "id",
    "nome",
    "email",
    "status",
    "data_atualizacao",
    "lote_importacao",
}

STATUS_MAP = {
    "APPROVED": "APROVADO",
    "APROVADO": "APROVADO",
    "UNDER_REVIEW": "EM_ANALISE",
    "EM_ANALISE": "EM_ANALISE",
    "EM ANALISE": "EM_ANALISE",
    "REJECTED": "REPROVADO",
    "REPROVADO": "REPROVADO",
}

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class IngestionValidationError(Exception):
    pass


def _parse_iso_datetime(value: str) -> datetime:
    normalized = value.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _sanitize_text(value: str) -> str:
    compact = "".join(ch for ch in value.strip() if ch.isprintable())
    return " ".join(compact.split())


def _normalize_status(value: str) -> str:
    normalized = _sanitize_text(value).upper()
    if normalized not in STATUS_MAP:
        raise IngestionValidationError("status_invalido")
    return STATUS_MAP[normalized]


def _mask_email(value: str) -> str:
    if "@" not in value:
        return "***"
    local, domain = value.split("@", 1)
    shown = local[:2] if len(local) >= 2 else local[:1]
    return f"{shown}***@{domain}"


def _require_fernet() -> Fernet:
    key = os.environ.get("CONECTA_PII_FERNET_KEY", "").strip()
    if not key:
        raise IngestionValidationError("pii_encryption_key_missing")
    try:
        return Fernet(key.encode("ascii"))
    except Exception as exc:  # pragma: no cover - defensive guard
        raise IngestionValidationError("pii_encryption_key_invalid") from exc


def _encrypt_email(email: str, fernet: Fernet) -> str:
    return fernet.encrypt(email.encode("utf-8")).decode("ascii")


def _hash_email(email: str) -> str:
    return hashlib.sha256(email.encode("utf-8")).hexdigest()


def _download_csv_bytes(source_url: str, timeout_seconds: int = 15) -> bytes:
    parsed = urlparse(source_url)
    if parsed.scheme not in {"http", "https"}:
        raise IngestionValidationError("source_url_scheme_invalid")

    connection_cls = http.client.HTTPSConnection if parsed.scheme == "https" else http.client.HTTPConnection
    port = parsed.port
    host = parsed.hostname or ""
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"

    headers: dict[str, str] = {"Accept": "text/csv,*/*"}
    auth_token = os.environ.get("CONECTA_INSCRICOES_SOURCE_TOKEN", "").strip()
    auth_header = os.environ.get("CONECTA_INSCRICOES_SOURCE_AUTH_HEADER", "Authorization").strip() or "Authorization"
    if auth_token:
        headers[auth_header] = auth_token

    connection = connection_cls(host=host, port=port, timeout=timeout_seconds)
    try:
        connection.request("GET", path, headers=headers)
        response = connection.getresponse()
        body = response.read()

        if response.status >= 400:
            raise IngestionValidationError(f"download_http_{response.status}")

        max_size_bytes = int(os.environ.get("CONECTA_INSCRICOES_MAX_FILE_BYTES", "5242880"))
        if len(body) > max_size_bytes:
            raise IngestionValidationError("source_file_too_large")

        return body
    finally:
        connection.close()


def _validate_headers(fieldnames: list[str] | None) -> None:
    if not fieldnames:
        raise IngestionValidationError("csv_header_missing")

    cleaned = {_sanitize_text(name).lower() for name in fieldnames if name}
    if cleaned != REQUIRED_COLUMNS:
        raise IngestionValidationError("csv_schema_mismatch")


def _build_batch_id() -> str:
    suffix = uuid.uuid4().hex[:8]
    return f"ING-{datetime.now(tz=timezone.utc).strftime('%Y%m%d%H%M%S')}-{suffix}"


def _update_batch_status(
    conn: sqlite3.Connection,
    batch_id: str,
    status: str,
    *,
    total_rows: int,
    valid_rows: int,
    invalid_rows: int,
    inserted_rows: int,
    updated_rows: int,
    schema_issues: str | None,
    error_summary: str | None,
) -> None:
    conn.execute(
        """
        UPDATE ingest_batches
        SET status_lote = ?,
            finalizado_em = ?,
            total_linhas = ?,
            linhas_validas = ?,
            linhas_invalidas = ?,
            registros_inseridos = ?,
            registros_atualizados = ?,
            divergencias_schema_json = ?,
            erro_resumo = ?
        WHERE lote_importacao = ?
        """,
        (
            status,
            utc_now_iso(),
            total_rows,
            valid_rows,
            invalid_rows,
            inserted_rows,
            updated_rows,
            schema_issues,
            error_summary,
            batch_id,
        ),
    )


def _already_processed_checksum(conn: sqlite3.Connection, checksum: str) -> bool:
    existing = conn.execute(
        """
        SELECT lote_importacao
        FROM ingest_batches
        WHERE checksum_arquivo = ?
          AND status_lote IN ('concluido', 'concluido_parcial')
        LIMIT 1
        """,
        (checksum,),
    ).fetchone()
    return existing is not None


def _validate_row(row: dict[str, str], row_number: int) -> dict[str, object]:
    normalized_id = _sanitize_text(str(row.get("id", ""))).upper()
    if not normalized_id:
        raise IngestionValidationError("id_obrigatorio")

    nome = _sanitize_text(str(row.get("nome", "")))
    if not nome:
        raise IngestionValidationError("nome_obrigatorio")

    email = _sanitize_text(str(row.get("email", ""))).lower()
    if not EMAIL_PATTERN.match(email):
        raise IngestionValidationError("email_invalido")

    status = _normalize_status(str(row.get("status", "")))
    data_atualizacao = _parse_iso_datetime(str(row.get("data_atualizacao", "")))

    source_lote = _sanitize_text(str(row.get("lote_importacao", "")))
    if not source_lote:
        raise IngestionValidationError("lote_importacao_origem_obrigatorio")

    return {
        "id": normalized_id,
        "nome": nome,
        "email": email,
        "status": status,
        "data_atualizacao": data_atualizacao,
        "lote_importacao_origem": source_lote,
        "row_number": row_number,
    }


def _upsert_inscricao(
    conn: sqlite3.Connection,
    payload: dict[str, object],
    *,
    batch_id: str,
    source_checksum: str,
    fernet: Fernet,
) -> str:
    now_iso = utc_now_iso()
    row = conn.execute(
        """
        SELECT data_atualizacao_origem
        FROM inscricoes
        WHERE id = ?
        """,
        (payload["id"],),
    ).fetchone()

    incoming_ts = payload["data_atualizacao"].isoformat()
    email = str(payload["email"])

    if row is None:
        conn.execute(
            """
            INSERT INTO inscricoes (
                id,
                nome,
                email_ciphertext,
                email_hash,
                status,
                data_atualizacao_origem,
                source_checksum,
                lote_importacao,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["id"],
                payload["nome"],
                _encrypt_email(email, fernet),
                _hash_email(email),
                payload["status"],
                incoming_ts,
                source_checksum,
                batch_id,
                now_iso,
                now_iso,
            ),
        )
        return "inserted"

    existing_ts = _parse_iso_datetime(str(row["data_atualizacao_origem"]))
    if payload["data_atualizacao"] <= existing_ts:
        return "skipped"

    conn.execute(
        """
        UPDATE inscricoes
        SET nome = ?,
            email_ciphertext = ?,
            email_hash = ?,
            status = ?,
            data_atualizacao_origem = ?,
            source_checksum = ?,
            lote_importacao = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            payload["nome"],
            _encrypt_email(email, fernet),
            _hash_email(email),
            payload["status"],
            incoming_ts,
            source_checksum,
            batch_id,
            now_iso,
            payload["id"],
        ),
    )
    return "updated"


@celery_app.task(
    bind=True,
    autoretry_for=(ConnectionError, OSError, http.client.HTTPException),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3,
)
def sync_inscricoes_from_csv(self, source_url: str | None = None, force_reprocess: bool = False) -> dict[str, object]:
    del self

    csv_url = (source_url or os.environ.get("CONECTA_INSCRICOES_CSV_URL", "")).strip()
    if not csv_url:
        raise IngestionValidationError("source_url_missing")

    init_database(DEFAULT_DB_FILE)

    batch_id = _build_batch_id()
    raw_csv = _download_csv_bytes(csv_url)
    checksum = hashlib.sha256(raw_csv).hexdigest()
    file_size = len(raw_csv)

    total_rows = 0
    valid_rows = 0
    invalid_rows = 0
    inserted_rows = 0
    updated_rows = 0
    seen_ids: set[str] = set()

    schema_issues = None
    fernet = _require_fernet()

    with create_connection(DEFAULT_DB_FILE) as conn:
        if not force_reprocess and _already_processed_checksum(conn, checksum):
            conn.execute(
                """
                INSERT INTO ingest_batches (
                    lote_importacao,
                    origem_url,
                    checksum_arquivo,
                    tamanho_arquivo_bytes,
                    status_lote,
                    iniciado_em,
                    finalizado_em,
                    erro_resumo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    batch_id,
                    csv_url,
                    checksum,
                    file_size,
                    "duplicado",
                    utc_now_iso(),
                    utc_now_iso(),
                    "checksum_ja_processado",
                ),
            )
            return {
                "ok": True,
                "status": "duplicado",
                "batchId": batch_id,
                "checksum": checksum,
            }

        conn.execute(
            """
            INSERT INTO ingest_batches (
                lote_importacao,
                origem_url,
                checksum_arquivo,
                tamanho_arquivo_bytes,
                status_lote,
                iniciado_em
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                batch_id,
                csv_url,
                checksum,
                file_size,
                "processando",
                utc_now_iso(),
            ),
        )

        try:
            text_content = raw_csv.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text_content))
            _validate_headers(reader.fieldnames)

            for index, row in enumerate(reader, start=2):
                total_rows += 1
                try:
                    validated = _validate_row(row, index)
                    validated_id = str(validated["id"])
                    if validated_id in seen_ids:
                        raise IngestionValidationError("id_duplicado_no_lote")
                    seen_ids.add(validated_id)

                    result = _upsert_inscricao(
                        conn,
                        validated,
                        batch_id=batch_id,
                        source_checksum=checksum,
                        fernet=fernet,
                    )
                    valid_rows += 1
                    if result == "inserted":
                        inserted_rows += 1
                    elif result == "updated":
                        updated_rows += 1
                except IngestionValidationError as exc:
                    invalid_rows += 1
                    conn.execute(
                        """
                        INSERT INTO ingest_batch_errors (
                            lote_importacao,
                            row_number,
                            error_code,
                            error_message,
                            payload_redigido,
                            recorded_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            batch_id,
                            index,
                            str(exc),
                            str(exc),
                            json.dumps(
                                {
                                    "id": _sanitize_text(str(row.get("id", ""))).upper(),
                                    "email": _mask_email(_sanitize_text(str(row.get("email", ""))).lower()),
                                    "status": _sanitize_text(str(row.get("status", ""))),
                                },
                                ensure_ascii=True,
                            ),
                            utc_now_iso(),
                        ),
                    )

            final_status = "concluido_parcial" if invalid_rows else "concluido"
            _update_batch_status(
                conn,
                batch_id,
                final_status,
                total_rows=total_rows,
                valid_rows=valid_rows,
                invalid_rows=invalid_rows,
                inserted_rows=inserted_rows,
                updated_rows=updated_rows,
                schema_issues=schema_issues,
                error_summary=None,
            )
        except Exception as exc:
            if str(exc) == "csv_schema_mismatch":
                schema_issues = json.dumps(
                    {
                        "requiredColumns": sorted(REQUIRED_COLUMNS),
                        "reason": "csv_schema_mismatch",
                    },
                    ensure_ascii=True,
                )

            _update_batch_status(
                conn,
                batch_id,
                "falhou",
                total_rows=total_rows,
                valid_rows=valid_rows,
                invalid_rows=invalid_rows,
                inserted_rows=inserted_rows,
                updated_rows=updated_rows,
                schema_issues=schema_issues,
                error_summary=str(exc),
            )
            raise

    return {
        "ok": True,
        "status": "concluido_parcial" if invalid_rows else "concluido",
        "batchId": batch_id,
        "checksum": checksum,
        "metrics": {
            "totalRows": total_rows,
            "validRows": valid_rows,
            "invalidRows": invalid_rows,
            "insertedRows": inserted_rows,
            "updatedRows": updated_rows,
            "fileSizeBytes": file_size,
        },
    }
