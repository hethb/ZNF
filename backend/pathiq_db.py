"""SQLAlchemy persistence for PathIQ workflow users, cases, and audit log.

Supports two backends:
  * Postgres in production (set ``DATABASE_URL`` — e.g. on Render).
  * SQLite locally (default ``data/pathiq_workflow.db``, override with ``PATHIQ_DB_PATH``).

The function-level API below is what the rest of the backend imports — the
underlying engine is hidden so individual call sites don't care which DB is in
use. Roles ``Admin`` and ``Lab Director`` see every case; everyone else only
sees cases they own (``owner_username`` matches their username).
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
    Text,
    create_engine,
    func,
    select,
)
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

# Roles that can see/modify every case regardless of owner.
ALL_ACCESS_ROLES = frozenset({"Admin", "Lab Director"})


def _normalize_db_url(raw: str) -> str:
    """Render hands out ``postgres://...`` but SQLAlchemy 2.x wants the explicit
    driver name. Normalize so both forms work."""
    if raw.startswith("postgres://"):
        return "postgresql+psycopg://" + raw[len("postgres://") :]
    if raw.startswith("postgresql://") and "+" not in raw.split("://", 1)[0]:
        return "postgresql+psycopg://" + raw[len("postgresql://") :]
    return raw


def _resolve_database_url() -> str:
    raw = os.environ.get("DATABASE_URL", "").strip()
    if raw:
        return _normalize_db_url(raw)
    sqlite_path = Path(os.environ.get("PATHIQ_DB_PATH", "data/pathiq_workflow.db"))
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{sqlite_path}"


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    owner_username: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(String(40), nullable=False)


class ComplianceAudit(Base):
    __tablename__ = "compliance_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[str] = mapped_column(String(40), nullable=False)
    actor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    actor_username: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


_engine: Optional[Engine] = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = _resolve_database_url()
        connect_args: Dict[str, Any] = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(url, future=True, pool_pre_ping=True, connect_args=connect_args)
    return _engine


def init_db() -> None:
    Base.metadata.create_all(get_engine())


def seed_demo_users_if_empty() -> None:
    """Seed the same demo accounts the UI hints at, if no users exist yet."""
    from backend.pathiq_auth import hash_password

    with Session(get_engine()) as s:
        if s.scalar(select(func.count()).select_from(User)) > 0:
            return
        demos = [
            ("admin", "admin123", "System Admin", "Admin"),
            ("director", "demo123", "Dr. Director", "Lab Director"),
            ("pathologist", "demo123", "Dr. Path", "Pathologist"),
            ("tech", "demo123", "Lab Tech", "Technician"),
            ("research", "demo123", "Research User", "Researcher"),
        ]
        for username, password, display_name, role in demos:
            s.add(
                User(
                    username=username,
                    password_hash=hash_password(password),
                    display_name=display_name,
                    role=role,
                )
            )
        s.commit()


def _user_to_dict(u: User) -> Dict[str, Any]:
    return {
        "id": u.id,
        "username": u.username,
        "password_hash": u.password_hash,
        "display_name": u.display_name,
        "role": u.role,
    }


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    if not username:
        return None
    norm = username.strip().lower()
    with Session(get_engine()) as s:
        u = s.scalar(select(User).where(User.username == norm))
        return _user_to_dict(u) if u else None


def create_user(username: str, password_hash: str, display_name: str, role: str) -> Dict[str, Any]:
    """Insert a new user. Raises ``ValueError`` if the username is already taken."""
    norm = (username or "").strip().lower()
    if not norm:
        raise ValueError("username is required")
    with Session(get_engine()) as s:
        u = User(
            username=norm,
            password_hash=password_hash,
            display_name=(display_name or norm).strip() or norm,
            role=role,
        )
        s.add(u)
        try:
            s.commit()
        except IntegrityError as exc:
            s.rollback()
            raise ValueError("username already exists") from exc
        s.refresh(u)
        return _user_to_dict(u)


def _case_row_to_dict(c: Case) -> Dict[str, Any]:
    body = json.loads(c.payload)
    body["id"] = c.id
    body["updatedAt"] = c.updated_at
    if c.owner_username is not None:
        body.setdefault("ownerUsername", c.owner_username)
    return body


def list_cases(
    requester_username: Optional[str] = None,
    requester_role: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Return cases visible to the requester. ``Admin``/``Lab Director`` see all
    cases (including legacy rows with no owner). Everyone else sees only what
    they own."""
    with Session(get_engine()) as s:
        stmt = select(Case).order_by(Case.updated_at.desc())
        if requester_role not in ALL_ACCESS_ROLES and requester_username:
            stmt = stmt.where(Case.owner_username == requester_username)
        rows: Sequence[Case] = s.scalars(stmt).all()
        return [_case_row_to_dict(r) for r in rows]


def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    with Session(get_engine()) as s:
        c = s.get(Case, case_id)
        return _case_row_to_dict(c) if c else None


def upsert_case(
    case_id: str,
    payload: Dict[str, Any],
    updated_at: str,
    owner_username: Optional[str] = None,
) -> None:
    """Insert or update a case. ``owner_username`` is set on insert and only
    overwritten when explicitly supplied (None means "don't touch")."""
    body = {k: v for k, v in payload.items() if k not in ("id", "updatedAt", "ownerUsername")}
    body_json = json.dumps(body)
    with Session(get_engine()) as s:
        c = s.get(Case, case_id)
        if c is None:
            s.add(
                Case(
                    id=case_id,
                    owner_username=owner_username,
                    payload=body_json,
                    updated_at=updated_at,
                )
            )
        else:
            c.payload = body_json
            c.updated_at = updated_at
            if owner_username is not None:
                c.owner_username = owner_username
        s.commit()


def delete_case(case_id: str) -> bool:
    with Session(get_engine()) as s:
        c = s.get(Case, case_id)
        if c is None:
            return False
        s.delete(c)
        s.commit()
        return True


def case_owner(case_id: str) -> Optional[str]:
    with Session(get_engine()) as s:
        c = s.get(Case, case_id)
        return c.owner_username if c else None


def fetch_compliance_rows(limit: int = 5000) -> List[Dict[str, Any]]:
    with Session(get_engine()) as s:
        stmt = (
            select(ComplianceAudit)
            .order_by(ComplianceAudit.id.desc())
            .limit(limit)
        )
        return [
            {
                "ts": r.ts,
                "actor": r.actor,
                "actor_username": r.actor_username,
                "action": r.action,
                "details": r.details,
            }
            for r in s.scalars(stmt).all()
        ]


def log_compliance(
    actor: str,
    action: str,
    details: str = "",
    actor_username: Optional[str] = None,
) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    with Session(get_engine()) as s:
        s.add(
            ComplianceAudit(
                ts=ts,
                actor=actor,
                actor_username=actor_username,
                action=action,
                details=details or None,
            )
        )
        s.commit()


def user_activity_stats(username: str, recent_limit: int = 10) -> Dict[str, Any]:
    """Roll up a single user's audit log into headline counts + recent rows."""
    norm = (username or "").strip().lower()
    if not norm:
        return {
            "logins": 0,
            "casesCreated": 0,
            "casesEdited": 0,
            "casesDeleted": 0,
            "totalActions": 0,
            "lastActive": None,
            "recent": [],
        }
    with Session(get_engine()) as s:
        action_counts = dict(
            s.execute(
                select(ComplianceAudit.action, func.count())
                .where(ComplianceAudit.actor_username == norm)
                .group_by(ComplianceAudit.action)
            ).all()
        )
        last_active = s.scalar(
            select(func.max(ComplianceAudit.ts)).where(ComplianceAudit.actor_username == norm)
        )
        recent_rows = s.scalars(
            select(ComplianceAudit)
            .where(ComplianceAudit.actor_username == norm)
            .order_by(ComplianceAudit.id.desc())
            .limit(recent_limit)
        ).all()
        recent = [
            {"ts": r.ts, "action": r.action, "details": r.details or ""}
            for r in recent_rows
        ]
    total = sum(int(v) for v in action_counts.values())
    return {
        "logins": int(action_counts.get("login", 0)) + int(action_counts.get("signup", 0)),
        "casesCreated": int(action_counts.get("case_upsert", 0)),
        "casesEdited": int(action_counts.get("case_patch", 0)),
        "casesDeleted": int(action_counts.get("case_delete", 0)),
        "totalActions": total,
        "lastActive": last_active,
        "recent": recent,
    }
