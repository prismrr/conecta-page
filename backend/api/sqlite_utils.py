"""Shared SQLite helpers for the backend API and jobs."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_CONTENT_AUDIT_EVENTS = [
    {
        "eventId": "AUD-20260512-001",
        "changedAt": "2026-05-12T14:20:00Z",
        "contentDomain": "privacy_policy",
        "contentTitle": "Politica de Privacidade",
        "version": "v2026.0",
        "author": "Time de Compliance",
        "changeSummary": "Publicacao inicial do resumo de privacidade do portal.",
        "changeType": "publish",
    },
    {
        "eventId": "AUD-20260520-001",
        "changedAt": "2026-05-20T10:30:00Z",
        "contentDomain": "registration_guidance",
        "contentTitle": "Orientacoes de Inscricao",
        "version": "v2026.2",
        "author": "Comite de Programa PRISM",
        "changeSummary": "Consolidacao de criterios, vigencia e fluxo oficial para submissao externa.",
        "changeType": "publish",
    },
    {
        "eventId": "AUD-20260523-001",
        "changedAt": "2026-05-23T09:10:00Z",
        "contentDomain": "terms_of_use",
        "contentTitle": "Termos de Uso",
        "version": "v2026.1",
        "author": "Time Juridico e Compliance",
        "changeSummary": "Publicacao versionada com regras de uso aceitavel e limites de responsabilidade.",
        "changeType": "publish",
    },
    {
        "eventId": "AUD-20260523-002",
        "changedAt": "2026-05-23T11:05:00Z",
        "contentDomain": "privacy_policy",
        "contentTitle": "Politica de Privacidade",
        "version": "v2026.1",
        "author": "Time de Compliance",
        "changeSummary": "Atualizacao de vigencia, changelog e transparencia de cookies por categoria.",
        "changeType": "revision",
    },
    {
        "eventId": "AUD-20260523-003",
        "changedAt": "2026-05-23T12:40:00Z",
        "contentDomain": "faq",
        "contentTitle": "FAQ Curada",
        "version": "v2026.1",
        "author": "Equipe Editorial Conecta",
        "changeSummary": "Publicacao de respostas oficiais consolidadas a partir das paginas criticas do portal.",
        "changeType": "publish",
    },
]


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def create_connection(db_file: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(str(db_file))
    connection.row_factory = sqlite3.Row
    return connection


def init_database(db_file: Path) -> None:
    db_file.parent.mkdir(parents=True, exist_ok=True)
    with create_connection(db_file) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS consent_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recorded_at TEXT NOT NULL,
                version TEXT NOT NULL,
                updated_at TEXT,
                source TEXT,
                status TEXT NOT NULL,
                categories_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS integration_monitor_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recorded_at TEXT NOT NULL,
                outcome TEXT NOT NULL,
                signal TEXT NOT NULL,
                detail TEXT,
                source_page TEXT
            );

            CREATE TABLE IF NOT EXISTS content_audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL UNIQUE,
                changed_at TEXT NOT NULL,
                content_domain TEXT NOT NULL,
                content_title TEXT NOT NULL,
                version TEXT NOT NULL,
                author TEXT NOT NULL,
                change_summary TEXT NOT NULL,
                change_type TEXT NOT NULL,
                recorded_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS telemetry_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recorded_at TEXT NOT NULL,
                event_name TEXT NOT NULL,
                page TEXT,
                path TEXT,
                release_id TEXT,
                environment TEXT,
                source_channel TEXT,
                session_id TEXT,
                outcome TEXT,
                reason TEXT,
                payload_json TEXT NOT NULL,
                forward_status TEXT NOT NULL,
                forward_error TEXT
            );

            CREATE TABLE IF NOT EXISTS observability_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                release_id TEXT,
                message TEXT NOT NULL,
                details_json TEXT NOT NULL,
                fingerprint TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS compliance_retention_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                executed_at TEXT NOT NULL,
                mode TEXT NOT NULL,
                report_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS compliance_incident_drills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                executed_at TEXT NOT NULL,
                scenario_id TEXT NOT NULL,
                status TEXT NOT NULL,
                report_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dsar_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                protocol TEXT NOT NULL UNIQUE,
                requested_at TEXT NOT NULL,
                request_type TEXT NOT NULL,
                source TEXT,
                status TEXT NOT NULL,
                details_hash TEXT,
                export_path TEXT,
                export_hash TEXT,
                exported_at TEXT,
                deleted_at TEXT,
                deletion_reason TEXT
            );
            """
        )

        existing_count = conn.execute("SELECT COUNT(1) AS total FROM content_audit_events").fetchone()["total"]
        if existing_count == 0:
            for event in DEFAULT_CONTENT_AUDIT_EVENTS:
                conn.execute(
                    """
                    INSERT INTO content_audit_events (
                        event_id,
                        changed_at,
                        content_domain,
                        content_title,
                        version,
                        author,
                        change_summary,
                        change_type,
                        recorded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event["eventId"],
                        event["changedAt"],
                        event["contentDomain"],
                        event["contentTitle"],
                        event["version"],
                        event["author"],
                        event["changeSummary"],
                        event["changeType"],
                        utc_now_iso(),
                    ),
                )
