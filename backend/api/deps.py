"""FastAPI dependencies for settings and security scaffolding."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, get_settings


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class Principal:
    subject: str
    scopes: tuple[str, ...] = ()
    auth_type: str = "anonymous"


def get_app_settings() -> Settings:
    return get_settings()


def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> Principal:
    if credentials is None:
        return Principal(subject="anonymous")

    token = credentials.credentials.strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized")

    return Principal(subject="service-account", auth_type="bearer")


def require_scopes(*required_scopes: str):
    required = set(required_scopes)

    def dependency(principal: Annotated[Principal, Depends(get_current_principal)]) -> Principal:
        if required and not required.issubset(set(principal.scopes)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
        return principal

    return dependency
