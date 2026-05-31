#!/usr/bin/env python3
"""Local runner for the FastAPI migration scaffold."""

from __future__ import annotations

import argparse

try:
    from backend.api.main import create_app
except ModuleNotFoundError as exc:  # pragma: no cover - runtime bootstrap guard
    raise SystemExit(
        "FastAPI is not installed. Install dependencies from backend/requirements-fastapi.txt first."
    ) from exc

try:
    import uvicorn
except ModuleNotFoundError as exc:  # pragma: no cover - runtime bootstrap guard
    raise SystemExit(
        "uvicorn is not installed. Install dependencies from backend/requirements-fastapi.txt first."
    ) from exc

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the Conecta PrismRR FastAPI app locally.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--reload", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    uvicorn.run(
        "backend.api.main:create_app",
        factory=True,
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
