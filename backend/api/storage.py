"""Storage helpers shared by the FastAPI migration services."""

from __future__ import annotations

from pathlib import Path

from backend.server.dev_server import create_connection, init_database, utc_now_iso


ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_FILE = ROOT_DIR / "data" / "compliance.db"
DEFAULT_DSAR_EXPORT_DIR = ROOT_DIR / "logs" / "dsar-exports"


def ensure_database() -> None:
    init_database(DEFAULT_DB_FILE)
