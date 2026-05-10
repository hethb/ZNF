"""Workflow: auth, case CRUD, PDF reports, RBAC metadata."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend.pathiq_auth import create_access_token, get_token_payload, verify_password
from backend.pathiq_db import (
    delete_case,
    fetch_compliance_rows,
    get_case,
    get_user_by_username,
    list_cases,
    log_compliance,
    upsert_case,
)
from backend.pathiq_pdf import build_ihc_report_pdf

router = APIRouter(prefix="/workflow", tags=["workflow"])


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def workflow_login(body: LoginBody) -> Dict[str, Any]:
    user = get_user_by_username(body.username)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    token = create_access_token(
        str(user["id"]),
        {"username": user["username"], "role": user["role"], "name": user["display_name"]},
    )
    log_compliance(user["display_name"], "login", f"user_id={user['id']}")
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


@router.get("/auth/me")
def workflow_me(payload: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    return {
        "id": int(payload.get("sub", 0)),
        "username": payload.get("username", ""),
        "name": payload.get("name", ""),
        "role": payload.get("role", ""),
    }


@router.get("/rbac/routes")
def rbac_routes(payload: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    from backend.pathiq_auth import ROLE_ROUTE_PREFIXES

    role = str(payload.get("role", ""))
    return {"role": role, "allowed_prefixes": ROLE_ROUTE_PREFIXES.get(role, [])}


@router.get("/cases")
def workflow_list_cases(_: Dict[str, Any] = Depends(get_token_payload)) -> List[Dict[str, Any]]:
    return list_cases()


class CaseUpsertBody(BaseModel):
    case: Dict[str, Any]


@router.post("/cases")
def workflow_create_case(body: CaseUpsertBody, payload: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    case = body.case
    cid = case.get("id")
    if not cid:
        raise HTTPException(status_code=400, detail="case.id is required")
    now = datetime.now(timezone.utc).isoformat()
    case["updatedAt"] = case.get("updatedAt") or now
    upsert_case(str(cid), case, case["updatedAt"])
    log_compliance(str(payload.get("name", "")), "case_upsert", f"case_id={cid}")
    return get_case(str(cid)) or case


@router.get("/cases/{case_id}")
def workflow_get_case(case_id: str, _: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    row = get_case(case_id)
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    return row


@router.patch("/cases/{case_id}")
def workflow_patch_case(
    case_id: str, body: CaseUpsertBody, payload: Dict[str, Any] = Depends(get_token_payload)
) -> Dict[str, Any]:
    existing = get_case(case_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Case not found")
    merged = {**existing, **body.case, "id": case_id}
    now = datetime.now(timezone.utc).isoformat()
    merged["updatedAt"] = now
    upsert_case(case_id, merged, now)
    log_compliance(str(payload.get("name", "")), "case_patch", f"case_id={case_id}")
    return get_case(case_id) or merged


@router.delete("/cases/{case_id}")
def workflow_delete_case(case_id: str, payload: Dict[str, Any] = Depends(get_token_payload)) -> Dict[str, Any]:
    role = str(payload.get("role", ""))
    if role not in ("Admin", "Lab Director"):
        raise HTTPException(status_code=403, detail="Insufficient role to delete cases")
    ok = delete_case(case_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Case not found")
    log_compliance(str(payload.get("name", "")), "case_delete", f"case_id={case_id}")
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
def export_compliance_csv(_: Dict[str, Any] = Depends(get_token_payload)) -> Response:
    import csv
    import io

    rows = fetch_compliance_rows(5000)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["timestamp", "actor", "action", "details"])
    for r in rows:
        w.writerow([r["ts"], r["actor"], r["action"], r["details"] or ""])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="pathiq_compliance_audit.csv"'},
    )
