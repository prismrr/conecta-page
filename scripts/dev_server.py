#!/usr/bin/env python3
"""Backward-compatible entrypoint for the backend dev server."""

from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.server.dev_server import main


if __name__ == "__main__":
    main()
