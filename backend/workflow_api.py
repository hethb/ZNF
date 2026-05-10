"""Workflow: auth, sign-up, per-user case CRUD, PDF reports, RBAC metadata."""
from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend.pathiq_auth import (
    ROLE_ROUTE_PREFIXES,
    create_access_token,
    get_token_payload,
    hash_password,
    verify_password,
)
from backend.pathiq_db import (
    ALL_ACCESS_ROLES,
    case_owner,
    create_user,
    delete_case,
    fetch_compliance_rows,
    get_case,
    get_user_by_username,
    list_cases,
    log_compliance,
    upsert_case,
    user_activity_stats,
)
from backend.pathiq_pdf import build_ihc_report_pdf

router = APIRouter(prefix="/workflow", tags=["workflow"])

# Roles a self-signed-up user is allowed to claim. Admin / Lab Director stay
# invite-only because they can read every case and (in the case of the former
# two) delete cases.
PUBLIC_SIGNUP_ROLES = ("Researcher", "Pathologist", "Technician")
USERNAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{2,31}$")
MIN_PASSWORD_LEN = 8


def _signup_enabled() -> bool:
    raw = os.environ.get("PATHIQ_ALLOW_SIGNUP", "true").strip().lower()
    return raw not in ("false", "0", "no", "off")


def _user_payload_from_token(payload: Dict[str, Any]) -> Dict[str, str]:
    return {
        "username": str(payload.get("username", "")),
        "name": str(payload.get("name", "")),
        "role": str(payload.get("role", "")),
    }


class LoginBody(BaseModel):
    username: str
    password: str


class SignupBody(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = Field(default=None, alias="displayName")
    role: Optional[str] = None

    model_config = {"populate_by_name": True}


def _issue_token_for_user(user: Dict[str, Any]) -> Dict[str, Any]:
    token = create_access_token(
        str(user["id"]),
        {"username": user["username"], "role": user["role"], "name": user["display_name"]},
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user["display_name"],
            "role": user["role"],
        },
    }


@router.post("/auth/login")
def workflow_login(body: LoginBody) -> Dict[str, Any]:
    user = get_user_by_username(body.username)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    log_compliance(
        user["display_name"],
        "login",
        f"user_id={user['id']}",
        actor_username=user["username"],
    )
    return _issue_token_for_user(user)


@router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def workflow_signup(body: SignupBody) -> Dict[str, Any]:
    if not _signup_enabled():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sign-up is disabled on this server")

    username = (body.username or "").strip().lower()
    if not USERNAME_PATTERN.match(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3–32 chars, lowercase letters/digits and . _ - (start alphanumeric).",
        )
    if not body.password or len(body.password) < MIN_PASSWORD_LEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {MIN_PASSWORD_LEN} characters.",
        )
    requested_role = (body.role or PUBLIC_SIGNUP_ROLES[0]).strip()
    if requested_role not in PUBLIC_SIGNUP_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role must be one of: {', '.join(PUBLIC_SIGNUP_ROLES)}",
        )
    display_name = (body.display_name or "").strip() or username

    try:
        user = create_user(
            username=username,
            password_hash=hash_password(body.password),
            display_name=display_name,
            role=requested_role,
        )
    except ValueError as exc:
        msg = str(exc)
        code = status.HTTP_409_CONFLICT if "exists" in msg else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=msg) from exc

    log_compliance(
        user["display_name"],
        "signup",
        f"role={user['role']}",
        actor_username=user["username"],
    )
    return _issue_token_for_user(user)


@router.get("/auth/me")
def workflow_me(payload: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    return {
        "id": int(payload.get("sub", 0)),
        "username": payload.get("username", ""),
        "name": payload.get("name", ""),
        "role": payload.get("role", ""),
    }


@router.get("/auth/config")
def workflow_auth_config() -> Dict[str, Any]:
    """Public config so the frontend can hide the sign-up form when disabled."""
    return {
        "signup_enabled": _signup_enabled(),
        "signup_roles": list(PUBLIC_SIGNUP_ROLES),
        "min_password_length": MIN_PASSWORD_LEN,
    }


@router.get("/me/stats")
def workflow_me_stats(payload: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    me = _user_payload_from_token(payload)
    stats = user_activity_stats(me["username"])
    stats["user"] = me
    return stats


@router.get("/rbac/routes")
def rbac_routes(payload: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    role = str(payload.get("role", ""))
    return {"role": role, "allowed_prefixes": ROLE_ROUTE_PREFIXES.get(role, [])}


@router.get("/cases")
def workflow_list_cases(payload: Dict[str, Any] = Depends(get_token_payload)) -> List[Dict[str, Any]]:
    me = _user_payload_from_token(payload)
    return list_cases(requester_username=me["username"], requester_role=me["role"])


class CaseUpsertBody(BaseModel):
    case: Dict[str, Any]


def _ensure_can_modify(case_id: str, me: Dict[str, str]) -> Optional[str]:
    """Returns the existing owner (or None for new cases). Raises 403 if the
    requester isn't allowed to modify an existing case they don't own."""
    if me["role"] in ALL_ACCESS_ROLES:
        return case_owner(case_id)
    owner = case_owner(case_id)
    if owner is None:
        return None
    if owner != me["username"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't own this case")
    return owner


@router.post("/cases")
def workflow_create_case(
    body: CaseUpsertBody, payload: Dict[str, Any] = Depends(get_token_payload)
) -> Dict[str, Any]:
    me = _user_payload_from_token(payload)
    case = body.case
    cid = case.get("id")
    if not cid:
        raise HTTPException(status_code=400, detail="case.id is required")

    existing_owner = _ensure_can_modify(str(cid), me)
    new_owner = existing_owner if existing_owner is not None else me["username"]

    now = datetime.now(timezone.utc).isoformat()
    case["updatedAt"] = case.get("updatedAt") or now
    upsert_case(str(cid), case, case["updatedAt"], owner_username=new_owner)
    log_compliance(
        me["name"],
        "case_upsert",
        f"case_id={cid}",
        actor_username=me["username"],
    )
    return get_case(str(cid)) or case


@router.get("/cases/{case_id}")
def workflow_get_case(case_id: str, payload: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    me = _user_payload_from_token(payload)
    row = get_case(case_id)
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    if me["role"] not in ALL_ACCESS_ROLES:
        owner = row.get("ownerUsername")
        if owner is not None and owner != me["username"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't own this case")
    return row


@router.patch("/cases/{case_id}")
def workflow_patch_case(
    case_id: str, body: CaseUpsertBody, payload: Dict[str, Any] = Depends(get_token_payload)
) -> Dict[str, Any]:
    me = _user_payload_from_token(payload)
    existing = get_case(case_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Case not found")
    existing_owner = _ensure_can_modify(case_id, me)
    merged = {**existing, **body.case, "id": case_id}
    now = datetime.now(timezone.utc).isoformat()
    merged["updatedAt"] = now
    upsert_case(
        case_id,
        merged,
        now,
        owner_username=existing_owner if existing_owner is not None else me["username"],
    )
    log_compliance(
        me["name"],
        "case_patch",
        f"case_id={case_id}",
        actor_username=me["username"],
    )
    return get_case(case_id) or merged


@router.delete("/cases/{case_id}")
def workflow_delete_case(
    case_id: str, payload: Dict[str, Any] = Depends(get_token_payload)
) -> Dict[str, Any]:
    me = _user_payload_from_token(payload)
    if me["role"] not in ALL_ACCESS_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient role to delete cases")
    ok = delete_case(case_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Case not found")
    log_compliance(
        me["name"],
        "case_delete",
        f"case_id={case_id}",
        actor_username=me["username"],
    )
    return {"status": "ok", "deleted": case_id}


class PdfReportBody(BaseModel):
    case: Dict[str, Any] = Field(default_factory=dict)
    lab_name: str = "PathIQ Lab"
    template: str = "Default Clinical Draft"


@router.post("/reports/pdf")
def workflow_report_pdf(body: PdfReportBody, _: Dict[str, Any] = Depends(get_token_payload)) -> Response:
    pdf_bytes = build_ihc_report_pdf(body.case, lab_name=body.lab_name, template=body.template)
    fname = f"pathiq_report_{body.case.get('caseId', 'export')}.pdf".replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/compliance/audit-log.csv")
def export_compliance_csv(payload: Dict[str, Any] = Depends(get_token_payload)) -> Response:
    import csv
    import io

    me = _user_payload_from_token(payload)
    if me["role"] not in ALL_ACCESS_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient role to export the compliance log")

    rows = fetch_compliance_rows(5000)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["timestamp", "actor", "actor_username", "action", "details"])
    for r in rows:
        w.writerow([r["ts"], r["actor"] or "", r["actor_username"] or "", r["action"], r["details"] or ""])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="pathiq_compliance_audit.csv"'},
    )
