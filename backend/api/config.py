"""Application settings for the FastAPI migration."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent.parent


@dataclass(frozen=True)
class Settings:
    app_name: str = "Conecta PrismRR API"
    app_version: str = "0.1.0"
    api_prefix: str = ""
    environment: str = "development"
    db_path: Path = ROOT_DIR / "data" / "compliance.db"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
