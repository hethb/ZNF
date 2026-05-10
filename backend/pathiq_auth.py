"""JWT auth, password hashing, and RBAC helpers for PathIQ workflow API."""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from jose import JWTError, jwt

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("PATHIQ_ACCESS_TOKEN_MINUTES", "1440"))

security = HTTPBearer(auto_error=False)

# role -> allowed frontend route prefixes (must match React paths)
ROLE_ROUTE_PREFIXES: Dict[str, List[str]] = {
    "Admin": [
        "/dashboard",
        "/upload",
        "/review-queue",
        "/cases",
        "/reports",
        "/analytics",
        "/validation",
        "/settings",
    ],
    "Lab Director": [
        "/dashboard",
        "/upload",
        "/review-queue",
        "/cases",
        "/reports",
        "/analytics",
        "/validation",
        "/settings",
    ],
    "Pathologist": [
        "/dashboard",
        "/review-queue",
        "/cases",
        "/reports",
    ],
    "Technician": ["/dashboard", "/upload", "/review-queue", "/cases"],
    "Researcher": [
        "/dashboard",
        "/upload",
        "/review-queue",
        "/cases",
        "/reports",
        "/validation",
    ],
}


def _jwt_secret() -> str:
    secret = os.environ.get("PATHIQ_JWT_SECRET", "").strip()
    if secret:
        return secret
    data_dir = Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)
    path = data_dir / ".jwt_secret"
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    s = secrets.token_urlsafe(48)
    path.write_text(s, encoding="utf-8")
    return s


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("ascii"))
    except (ValueError, TypeError):
        return False


def hash_password(plain: str) -> str:
    """Bcrypt hash (compatible with passlib-generated hashes in existing DBs)."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("ascii")


def create_access_token(sub: str, extra: Optional[Dict[str, Any]] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: Dict[str, Any] = {"sub": sub, "exp": expire}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _jwt_secret(), algorithm=ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, _jwt_secret(), algorithms=[ALGORITHM])


async def get_token_payload(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return decode_token(creds.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def role_allows_route(role: str, path: str) -> bool:
    prefixes = ROLE_ROUTE_PREFIXES.get(role, [])
    p = path.split("?", 1)[0].rstrip("/") or "/"
    for pref in prefixes:
        pref_n = pref.rstrip("/")
        if p == pref_n or p.startswith(pref_n + "/"):
            return True
    return False
