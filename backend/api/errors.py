"""HTTP exception handlers for the FastAPI migration."""

from __future__ import annotations

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "internal_error"
    return JSONResponse(status_code=exc.status_code, content={"ok": False, "error": detail})


async def request_validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"ok": False, "error": "validation_error", "issues": exc.errors()},
    )
