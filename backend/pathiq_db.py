"""SQLite persistence for PathIQ workflow users and cases."""
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(os.environ.get("PATHIQ_DB_PATH", "data/pathiq_workflow.db"))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _connect()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                display_name TEXT NOT NULL,
                role TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS compliance_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                actor TEXT,
                action TEXT NOT NULL,
                details TEXT
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def seed_demo_users_if_empty() -> None:
    from backend.pathiq_auth import hash_password

    conn = _connect()
    try:
        row = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()
        if row and int(row["c"]) > 0:
            return
        demos = [
            ("admin", "admin123", "System Admin", "Admin"),
            ("director", "demo123", "Dr. Director", "Lab Director"),
            ("pathologist", "demo123", "Dr. Path", "Pathologist"),
            ("tech", "demo123", "Lab Tech", "Technician"),
            ("research", "demo123", "Research User", "Researcher"),
        ]
        for username, password, display_name, role in demos:
            conn.execute(
                "INSERT INTO users (username, password_hash, display_name, role) VALUES (?,?,?,?)",
                (username, hash_password(password), display_name, role),
            )
        conn.commit()
    finally:
        conn.close()


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, display_name, role FROM users WHERE username = ?",
            (username.strip().lower(),),
        ).fetchone()
        if not row:
            return None
        return dict(row)
    finally:
        conn.close()


def list_cases() -> List[Dict[str, Any]]:
    conn = _connect()
    try:
        rows = conn.execute("SELECT id, payload, updated_at FROM cases ORDER BY updated_at DESC").fetchall()
        return [{"id": r["id"], **json.loads(r["payload"]), "updatedAt": r["updated_at"]} for r in rows]
    finally:
        conn.close()


def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    try:
        row = conn.execute("SELECT id, payload, updated_at FROM cases WHERE id = ?", (case_id,)).fetchone()
        if not row:
            return None
        data = json.loads(row["payload"])
        data["id"] = row["id"]
        return data
    finally:
        conn.close()


def upsert_case(case_id: str, payload: Dict[str, Any], updated_at: str) -> None:
    conn = _connect()
    try:
        body = {k: v for k, v in payload.items() if k != "id"}
        conn.execute(
            "INSERT INTO cases (id, payload, updated_at) VALUES (?,?,?) "
            "ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
            (case_id, json.dumps(body), updated_at),
        )
        conn.commit()
    finally:
        conn.close()


def delete_case(case_id: str) -> bool:
    conn = _connect()
    try:
        cur = conn.execute("DELETE FROM cases WHERE id = ?", (case_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def fetch_compliance_rows(limit: int = 5000) -> List[sqlite3.Row]:
    conn = _connect()
    try:
        return list(
            conn.execute(
                "SELECT ts, actor, action, details FROM compliance_audit ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        )
    finally:
        conn.close()


def log_compliance(actor: str, action: str, details: str = "") -> None:
    from datetime import datetime, timezone

    conn = _connect()
    try:
        ts = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO compliance_audit (ts, actor, action, details) VALUES (?,?,?,?)",
            (ts, actor, action, details),
        )
        conn.commit()
    finally:
        conn.close()
