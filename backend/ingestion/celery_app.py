"""Celery application for async CSV ingestion tasks."""

from __future__ import annotations

import os

from celery import Celery
from celery.schedules import crontab


BROKER_URL = os.environ.get("CONECTA_CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_BACKEND = os.environ.get("CONECTA_CELERY_RESULT_BACKEND", BROKER_URL)

celery_app = Celery("conecta_ingestion", broker=BROKER_URL, backend=RESULT_BACKEND)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_default_queue="ingestao_csv",
    task_routes={
        "backend.ingestion.tasks.sync_inscricoes_from_csv": {"queue": "ingestao_csv"},
    },
    beat_schedule={
        "sync-inscricoes-daily": {
            "task": "backend.ingestion.tasks.sync_inscricoes_from_csv",
            "schedule": crontab(minute=0, hour=3),
            "kwargs": {},
        }
    },
)

celery_app.autodiscover_tasks(["backend.ingestion"])
