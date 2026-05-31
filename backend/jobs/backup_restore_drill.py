#!/usr/bin/env python3
"""Backup and restore verification drill for compliance SQLite data."""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_FILE = ROOT_DIR / "data" / "compliance.db"
DEFAULT_REPORT_FILE = ROOT_DIR / "logs" / "compliance-backup-restore-report.json"
DEFAULT_SUMMARY_FILE = ROOT_DIR / "logs" / "compliance-backup-restore-summary.md"
DEFAULT_BACKUP_FILE = ROOT_DIR / "logs" / "compliance-backups" / "compliance-backup.sqlite"
DEFAULT_RESTORED_FILE = ROOT_DIR / "logs" / "compliance-backups" / "compliance-restored.sqlite"


def create_connection(db_file: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    return conn


def list_tables(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    ).fetchall()
    return [str(row["name"]) for row in rows]


def table_row_count(conn: sqlite3.Connection, table_name: str) -> int:
    row = conn.execute(f"SELECT COUNT(1) AS total FROM {table_name}").fetchone()
    return int(row["total"] or 0)


def build_table_snapshot(conn: sqlite3.Connection, table_names: list[str]) -> dict[str, int]:
    return {table_name: table_row_count(conn, table_name) for table_name in table_names}


def run_backup_restore(db_file: Path, report_file: Path, summary_file: Path, backup_file: Path, restored_file: Path) -> dict:
    report = {
        "status": "skipped_db_missing",
        "database": str(db_file),
        "backupFile": str(backup_file),
        "restoredFile": str(restored_file),
        "tablesVerified": [],
        "originalSnapshot": {},
        "restoredSnapshot": {},
    }

    if not db_file.exists():
        return report

    backup_file.parent.mkdir(parents=True, exist_ok=True)
    restored_file.parent.mkdir(parents=True, exist_ok=True)

    shutil.copy2(db_file, backup_file)
    shutil.copy2(backup_file, restored_file)

    with create_connection(db_file) as source_conn, create_connection(restored_file) as restored_conn:
        table_names = list_tables(source_conn)
        original_snapshot = build_table_snapshot(source_conn, table_names)
        restored_snapshot = build_table_snapshot(restored_conn, table_names)

    tables_verified = sorted(table_names)
    snapshots_match = original_snapshot == restored_snapshot
    report.update(
        {
            "status": "pass" if snapshots_match else "fail",
            "tablesVerified": tables_verified,
            "originalSnapshot": original_snapshot,
            "restoredSnapshot": restored_snapshot,
        }
    )

    report_file.parent.mkdir(parents=True, exist_ok=True)
    report_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")

    summary_lines = [
        "# Compliance Backup and Restore Summary",
        "",
        f"- Status: {report['status'].upper()}",
        f"- Database: {report['database']}",
        f"- Backup File: {report['backupFile']}",
        f"- Restored File: {report['restoredFile']}",
        f"- Tables Verified: {len(tables_verified)}",
        "",
        "## Verified Tables",
        "",
        *(f"- {table_name}: {original_snapshot[table_name]} rows" for table_name in tables_verified),
    ]
    summary_file.parent.mkdir(parents=True, exist_ok=True)
    summary_file.write_text("\n".join(summary_lines) + "\n", encoding="utf-8")

    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run backup and restore verification drill")
    parser.add_argument("--db-file", default=str(DEFAULT_DB_FILE), help="Path to compliance SQLite database")
    parser.add_argument("--report-file", default=str(DEFAULT_REPORT_FILE), help="Path to JSON report output")
    parser.add_argument("--summary-file", default=str(DEFAULT_SUMMARY_FILE), help="Path to markdown summary output")
    parser.add_argument("--backup-file", default=str(DEFAULT_BACKUP_FILE), help="Path to backup copy output")
    parser.add_argument("--restored-file", default=str(DEFAULT_RESTORED_FILE), help="Path to restored verification copy")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = run_backup_restore(
        db_file=Path(args.db_file),
        report_file=Path(args.report_file),
        summary_file=Path(args.summary_file),
        backup_file=Path(args.backup_file),
        restored_file=Path(args.restored_file),
    )

    print(json.dumps({"ok": True, "status": report["status"], "reportFile": str(args.report_file)}, ensure_ascii=True))


if __name__ == "__main__":
    main()