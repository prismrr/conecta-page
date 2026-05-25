#!/usr/bin/env python3
"""Backward-compatible entrypoint for the backend incident drill."""

from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.jobs.incident_drill import main


if __name__ == "__main__":
    main()
