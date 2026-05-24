#!/usr/bin/env python3
"""Retention and disposal job for compliance-related SQLite data."""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_FILE = ROOT_DIR / "data" / "compliance.db"
DEFAULT_REPORT_FILE = ROOT_DIR / "logs" / "compliance-retention-report.json"

RETENTION_POLICY = {
    "consent_records": {"column": "recorded_at", "retention_days": 730},
    "integration_monitor_events": {"column": "recorded_at", "retention_days": 365},
    "telemetry_events": {"column": "recorded_at", "retention_days": 180},
    "observability_alerts": {"column": "created_at", "retention_days": 180},
}


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def parse_iso_timestamp(value: str) -> datetime | None:
    if not value:
        return None

    normalized = value
    if value.endswith("Z"):
        normalized = value[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def ensure_retention_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS compliance_retention_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            executed_at TEXT NOT NULL,
            mode TEXT NOT NULL,
            report_json TEXT NOT NULL
        )
        """
    )


def evaluate_table(
    conn: sqlite3.Connection,
    table_name: str,
    timestamp_column: str,
    retention_days: int,
    now_utc: datetime,
    dry_run: bool,
) -> dict:
    rows = conn.execute(
        f"SELECT id, {timestamp_column} AS ts_value FROM {table_name}"
    ).fetchall()

    cutoff = now_utc - timedelta(days=retention_days)
    ids_to_discard: list[int] = []

    for row in rows:
        parsed = parse_iso_timestamp(str(row["ts_value"] or ""))
        if parsed and parsed < cutoff:
            ids_to_discard.append(int(row["id"]))

    discarded_count = len(ids_to_discard)

    if discarded_count and not dry_run:
        placeholders = ",".join(["?"] * discarded_count)
        conn.execute(f"DELETE FROM {table_name} WHERE id IN ({placeholders})", ids_to_discard)

    return {
        "table": table_name,
        "retentionDays": retention_days,
        "cutoff": cutoff.isoformat(),
        "scannedRows": len(rows),
        "discardedRows": discarded_count,
    }


def run_retention(db_file: Path, report_file: Path, dry_run: bool) -> dict:
    executed_at = utc_now_iso()
    report = {
        "executedAt": executed_at,
        "mode": "dry-run" if dry_run else "apply",
        "database": str(db_file),
        "status": "ok",
        "policy": RETENTION_POLICY,
        "results": [],
        "discardedTotal": 0,
    }

    if not db_file.exists():
        report["status"] = "skipped_db_missing"
        return report

    now_utc = datetime.now(tz=timezone.utc)

    with sqlite3.connect(str(db_file)) as conn:
        conn.row_factory = sqlite3.Row
        ensure_retention_table(conn)

        for table_name, config in RETENTION_POLICY.items():
            result = evaluate_table(
                conn=conn,
                table_name=table_name,
                timestamp_column=str(config["column"]),
                retention_days=int(config["retention_days"]),
                now_utc=now_utc,
                dry_run=dry_run,
            )
            report["results"].append(result)
            report["discardedTotal"] += int(result["discardedRows"])

        conn.execute(
            """
            INSERT INTO compliance_retention_runs (
                executed_at,
                mode,
                report_json
            ) VALUES (?, ?, ?)
            """,
            (
                executed_at,
                report["mode"],
                json.dumps(report, ensure_ascii=True),
            ),
        )

    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run automated retention/disposal job")
    parser.add_argument("--db-file", default=str(DEFAULT_DB_FILE), help="Path to compliance SQLite database")
    parser.add_argument(
        "--report-file",
        default=str(DEFAULT_REPORT_FILE),
        help="Path to JSON report output",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Evaluate retention policy without deleting rows",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    db_file = Path(args.db_file)
    report_file = Path(args.report_file)

    report = run_retention(db_file=db_file, report_file=report_file, dry_run=bool(args.dry_run))

    report_file.parent.mkdir(parents=True, exist_ok=True)
    report_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")

    print(json.dumps({"ok": True, "reportFile": str(report_file), "status": report["status"]}, ensure_ascii=True))


if __name__ == "__main__":
    main()
