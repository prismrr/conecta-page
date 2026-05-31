"""FastAPI app factory for the Conecta PrismRR API."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from .errors import http_exception_handler, request_validation_exception_handler
from .routers.compliance import router as compliance_router
from .routers.health import router as health_router
from .routers.observability import router as observability_router
from .routers.registrations import router as registrations_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Conecta PrismRR API",
        version="0.1.0",
        summary="FastAPI migration base for the Conecta PrismRR backend.",
        description=(
            "Migration scaffold for typed, async-first API routes with contract-safe responses, "
            "dependency injection and OpenAPI documentation."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
        allow_credentials=False,
    )

    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, request_validation_exception_handler)

    app.include_router(health_router)
    app.include_router(registrations_router)
    app.include_router(compliance_router)
    app.include_router(observability_router)

    return app


app = create_app()
