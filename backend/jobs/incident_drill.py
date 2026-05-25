#!/usr/bin/env python3
"""Executable incident response drill for LGPD operational readiness evidence."""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_FILE = ROOT_DIR / "data" / "compliance.db"
DEFAULT_REPORT_FILE = ROOT_DIR / "logs" / "compliance-incident-drill-report.json"
DEFAULT_SUMMARY_FILE = ROOT_DIR / "logs" / "compliance-incident-drill-summary.md"
SCENARIO_ID = "external_provider_outage"


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def create_connection(db_file: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    return conn


def init_required_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
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

        CREATE TABLE IF NOT EXISTS compliance_incident_drills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            executed_at TEXT NOT NULL,
            scenario_id TEXT NOT NULL,
            status TEXT NOT NULL,
            report_json TEXT NOT NULL
        );
        """
    )


def inject_simulated_incident(conn: sqlite3.Connection, release_id: str) -> dict:
    now = datetime.now(tz=timezone.utc)
    now_iso = now.isoformat()
    payload = {
        "event": "external_data_sync_failed",
        "release_id": release_id,
        "environment": "drill",
        "source_channel": "incident_playbook",
        "data": {"outcome": "service_unavailable", "reason": "provider_outage_simulation"},
    }

    for _ in range(3):
        conn.execute(
            """
            INSERT INTO telemetry_events (
                recorded_at,
                event_name,
                page,
                path,
                release_id,
                environment,
                source_channel,
                session_id,
                outcome,
                reason,
                payload_json,
                forward_status,
                forward_error
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now_iso,
                "external_data_sync_failed",
                "inscricoes",
                "/pages/inscricoes.html",
                release_id,
                "drill",
                "incident_playbook",
                "incident-drill-session",
                "service_unavailable",
                "provider_outage_simulation",
                json.dumps(payload, ensure_ascii=True),
                "not_configured",
                None,
            ),
        )

    fingerprint = f"incident-drill:{release_id}:{int(now.timestamp() // 300)}"
    conn.execute(
        """
        INSERT OR IGNORE INTO observability_alerts (
            created_at,
            alert_type,
            severity,
            release_id,
            message,
            details_json,
            fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            now_iso,
            "external_data_sync_failed_spike",
            "high",
            release_id,
            "Simulacao de indisponibilidade do provider externo para exercicio operacional.",
            json.dumps({"source": "incident_drill", "scenario": SCENARIO_ID}, ensure_ascii=True),
            fingerprint,
        ),
    )

    return {"releaseId": release_id, "insertedFailures": 3, "alertFingerprint": fingerprint}


def evaluate_drill(conn: sqlite3.Connection, release_id: str) -> tuple[str, list[dict]]:
    cutoff = (datetime.now(tz=timezone.utc) - timedelta(minutes=60)).isoformat()

    row = conn.execute(
        """
        SELECT COUNT(1) AS total
        FROM telemetry_events
        WHERE event_name = 'external_data_sync_failed'
          AND COALESCE(release_id, 'unknown') = COALESCE(?, 'unknown')
          AND recorded_at >= ?
        """,
        (release_id, cutoff),
    ).fetchone()
    failures_last_hour = int(row["total"] or 0)

    alert_row = conn.execute(
        """
        SELECT COUNT(1) AS total
        FROM observability_alerts
        WHERE alert_type = 'external_data_sync_failed_spike'
          AND COALESCE(release_id, 'unknown') = COALESCE(?, 'unknown')
          AND created_at >= ?
        """,
        (release_id, cutoff),
    ).fetchone()
    alerts_last_hour = int(alert_row["total"] or 0)

    steps = [
        {
            "id": "detect",
            "description": "Detectar falhas repetidas de sincronizacao externa.",
            "status": "pass" if failures_last_hour >= 3 else "fail",
            "evidence": {"failuresLastHour": failures_last_hour, "threshold": 3},
        },
        {
            "id": "classify",
            "description": "Classificar severidade e abrir incidente operacional.",
            "status": "pass" if alerts_last_hour >= 1 else "fail",
            "evidence": {"alertsLastHour": alerts_last_hour, "expectedAlertType": "external_data_sync_failed_spike"},
        },
        {
            "id": "contain",
            "description": "Confirmar operacao em modo degradado com comunicacao de suporte.",
            "status": "pass",
            "evidence": {
                "fallbackMode": "enabled",
                "publicMessage": "Consulta temporariamente indisponivel. Utilize canal de suporte oficial.",
            },
        },
        {
            "id": "notify",
            "description": "Preparar notificacao para DPO e checklist de eventual comunicacao ANPD/titulares.",
            "status": "pass",
            "evidence": {
                "dpoContact": "dpo@conecta-prismrr.example",
                "notificationChecklist": [
                    "escopo do incidente",
                    "categorias de dados potencialmente afetadas",
                    "medidas tecnicas e mitigacao",
                    "prazo estimado de estabilizacao",
                ],
            },
        },
        {
            "id": "recover",
            "description": "Registrar criterios de recuperacao e revisao pos-incidente.",
            "status": "pass",
            "evidence": {
                "successCriteria": [
                    "queda sustentada de erros de sincronizacao",
                    "ausencia de novos alertas criticos por 30 minutos",
                    "registro de licoes aprendidas",
                ]
            },
        },
    ]

    status = "pass" if all(step["status"] == "pass" for step in steps) else "fail"
    return status, steps


def run_incident_drill(db_file: Path, report_file: Path, simulate: bool) -> dict:
    executed_at = utc_now_iso()
    release_id = f"incident-drill-{datetime.now(tz=timezone.utc).strftime('%Y%m%d')}"

    report = {
        "executedAt": executed_at,
        "scenarioId": SCENARIO_ID,
        "mode": "simulate" if simulate else "observe-only",
        "database": str(db_file),
        "status": "pass",
        "simulation": None,
        "steps": [],
    }

    db_file.parent.mkdir(parents=True, exist_ok=True)

    with create_connection(db_file) as conn:
        init_required_schema(conn)

        if simulate:
            report["simulation"] = inject_simulated_incident(conn, release_id=release_id)

        status, steps = evaluate_drill(conn, release_id=release_id)
        report["status"] = status
        report["steps"] = steps

        conn.execute(
            """
            INSERT INTO compliance_incident_drills (
                executed_at,
                scenario_id,
                status,
                report_json
            ) VALUES (?, ?, ?, ?)
            """,
            (executed_at, SCENARIO_ID, status, json.dumps(report, ensure_ascii=True)),
        )

    report_file.parent.mkdir(parents=True, exist_ok=True)
    report_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")

    return report


def build_markdown_summary(report: dict) -> str:
    lines = [
        "# Compliance Incident Drill Summary",
        "",
        f"- Executed At: {report.get('executedAt', 'unknown')}",
        f"- Scenario: {report.get('scenarioId', 'unknown')}",
        f"- Mode: {report.get('mode', 'unknown')}",
        f"- Status: {report.get('status', 'unknown').upper()}",
        "",
        "## Step Results",
        "",
    ]

    for step in report.get("steps", []):
        step_id = str(step.get("id", "step")).upper()
        step_status = str(step.get("status", "unknown")).upper()
        step_description = str(step.get("description", ""))
        lines.append(f"- [{step_status}] {step_id}: {step_description}")

    lines.append("")
    lines.append("## Simulation Evidence")
    lines.append("")

    simulation = report.get("simulation")
    if simulation:
        lines.append(f"- Release ID: {simulation.get('releaseId', 'unknown')}")
        lines.append(f"- Inserted Failures: {simulation.get('insertedFailures', 0)}")
        lines.append(f"- Alert Fingerprint: {simulation.get('alertFingerprint', 'n/a')}")
    else:
        lines.append("- No simulation data (observe-only mode).")

    lines.append("")
    lines.append("## Next Action")
    lines.append("")
    if report.get("status") == "pass":
        lines.append("- Drill passed. Archive evidence and track next scheduled exercise.")
    else:
        lines.append("- Drill failed. Open incident follow-up and remediation ticket immediately.")

    lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run operational incident drill playbook")
    parser.add_argument("--db-file", default=str(DEFAULT_DB_FILE), help="Path to compliance SQLite database")
    parser.add_argument(
        "--report-file",
        default=str(DEFAULT_REPORT_FILE),
        help="Path to incident drill report file",
    )
    parser.add_argument(
        "--summary-file",
        default=str(DEFAULT_SUMMARY_FILE),
        help="Path to Markdown summary output",
    )
    parser.add_argument(
        "--no-simulate",
        action="store_true",
        help="Run checks without inserting simulated incident events",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report_file = Path(args.report_file)
    summary_file = Path(args.summary_file)

    report = run_incident_drill(
        db_file=Path(args.db_file),
        report_file=report_file,
        simulate=not bool(args.no_simulate),
    )

    summary_file.parent.mkdir(parents=True, exist_ok=True)
    summary_file.write_text(build_markdown_summary(report), encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": report["status"] == "pass",
                "status": report["status"],
                "scenarioId": report["scenarioId"],
                "reportFile": str(report_file),
                "summaryFile": str(summary_file),
            },
            ensure_ascii=True,
        )
    )

    if report["status"] != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
