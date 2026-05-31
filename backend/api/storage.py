"""Storage helpers shared by the FastAPI migration services."""

from __future__ import annotations

import asyncio
from pathlib import Path

import aiosqlite

from backend.server.dev_server import create_connection, init_database, utc_now_iso


ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_FILE = ROOT_DIR / "data" / "compliance.db"
DEFAULT_DSAR_EXPORT_DIR = ROOT_DIR / "logs" / "dsar-exports"


def ensure_database() -> None:
    init_database(DEFAULT_DB_FILE)


async def ensure_database_async() -> None:
    await asyncio.to_thread(init_database, DEFAULT_DB_FILE)


async def execute_async(sql: str, parameters: tuple[object, ...] = (), db_file: Path = DEFAULT_DB_FILE) -> None:
    async with aiosqlite.connect(str(db_file)) as connection:
        await connection.execute(sql, parameters)
        await connection.commit()


async def fetch_one_async(
    sql: str,
    parameters: tuple[object, ...] = (),
    db_file: Path = DEFAULT_DB_FILE,
):
    async with aiosqlite.connect(str(db_file)) as connection:
        connection.row_factory = aiosqlite.Row
        async with connection.execute(sql, parameters) as cursor:
            return await cursor.fetchone()


async def fetch_all_async(
    sql: str,
    parameters: tuple[object, ...] = (),
    db_file: Path = DEFAULT_DB_FILE,
):
    async with aiosqlite.connect(str(db_file)) as connection:
        connection.row_factory = aiosqlite.Row
        async with connection.execute(sql, parameters) as cursor:
            return await cursor.fetchall()
