from __future__ import annotations

import base64
import os
import csv
import io
import tempfile
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from PIL import Image
from pydantic import BaseModel, Field
from sklearn.metrics import cohen_kappa_score, confusion_matrix

from backend.model.ihc_analyzer import IHCAnalyzer, INTENSITY_LABELS
from backend.utils.gradcam import generate_gradcam_overlay_base64
from backend.utils.preprocessing import PreprocessConfig, cap_pil_long_edge, preprocess_pil_image

app = FastAPI(title="PathIQ API", version="0.1.0")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Baseline security and compliance-oriented response headers (demo / pilot)."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response


app.add_middleware(SecurityHeadersMiddleware)

_cors_raw = os.environ.get("PATHIQ_CORS_ORIGINS", "").strip()
if _cors_raw:
    _cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
    _cors_credentials = True
else:
    _cors_origins = ["*"]
    _cors_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _pathiq_startup() -> None:
    from backend.pathiq_db import init_db, seed_demo_users_if_empty

    init_db()
    seed_demo_users_if_empty()


from backend.workflow_api import router as workflow_router  # noqa: E402

app.include_router(workflow_router)

ANALYZER = IHCAnalyzer(
    intensity_model_path=Path("backend/model/artifacts/best_intensity_model.keras"),
    tissue_model_path=Path("backend/model/artifacts/best_tissue_model.keras"),
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
DEFAULT_UNCERTAINTY_STD_THRESHOLD = 0.14
DEFAULT_ENTROPY_NORM_THRESHOLD = 0.62
# Fewer runs = faster CPU inference; 3 is a good default for interactive /analyze.
DEFAULT_MC_DROPOUT_RUNS = 3
FEEDBACK_CSV_PATH = Path("data/feedback/prediction_feedback.csv")
AUDIT_CSV_PATH = Path("data/feedback/audit_log.csv")


def _validate_image_filename(filename: str) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Upload JPG or PNG.")


def _parse_form_bool(value: Any, *, default: bool = True) -> bool:
    """Multipart booleans often arrive as strings; accept common truthy/falsey forms."""
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    s = str(value).strip().lower()
    if s in ("false", "0", "no", "off", ""):
        return False
    return True


def _ensure_models_ready() -> None:
    if not ANALYZER.ready:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model not loaded. Expected artifacts at "
                "backend/model/artifacts/best_intensity_model.keras and "
                "backend/model/artifacts/best_tissue_model.keras."
            ),
        )


def _open_image_from_bytes(raw: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc

    cfg = PreprocessConfig()
    if img.width < cfg.min_size[0] or img.height < cfg.min_size[1]:
        raise HTTPException(status_code=400, detail="Image too small. Minimum size is 64x64.")
    return cap_pil_long_edge(img, cfg.max_input_long_edge)


def _result_to_row(filename: str, result: Any) -> Dict[str, Any]:
    return {
        "filename": filename,
        "tissue_type": result.tissue_type,
        "tissue_confidence": round(result.tissue_confidence, 4),
        "intensity_score": result.intensity_score,
        "intensity_label": result.intensity_label,
        "confidence": round(result.confidence, 4),
        "uncertainty_std": round(result.uncertainty_std, 4),
        "uncertainty_combined": round(result.uncertainty_combined, 4),
        "prediction_entropy": round(result.prediction_entropy, 4),
        "intensity_probabilities": [round(p, 4) for p in result.intensity_probabilities],
        "stain_burden_0_100": round(result.stain_burden_0_100, 2),
        "non_tumor_context": result.non_tumor_context,
        "needs_review": result.needs_review,
        "flag_for_review": result.needs_review,
    }


def _row_for_csv(row: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(row)
    probs = out.get("intensity_probabilities")
    if isinstance(probs, list):
        out["intensity_probabilities"] = ";".join(str(p) for p in probs)
    return out


def _batch_sort_key(row: Dict[str, Any]) -> tuple:
    if row.get("error"):
        return (1, 0.0)
    u = float(row.get("uncertainty_combined", 0))
    return (0, -u)


def _rows_from_zip_bytes(
    raw: bytes,
    uncertainty_std_threshold: float,
    entropy_norm_threshold: float,
    mc_runs: int = DEFAULT_MC_DROPOUT_RUNS,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as tmp:
        zip_path = Path(tmp) / "batch.zip"
        zip_path.write_bytes(raw)
        with zipfile.ZipFile(zip_path, "r") as zf:
            for name in zf.namelist():
                if name.endswith("/"):
                    continue
                ext = Path(name).suffix.lower()
                if ext not in ALLOWED_EXTENSIONS:
                    continue
                with zf.open(name) as f:
                    img_bytes = f.read()
                try:
                    img = _open_image_from_bytes(img_bytes)
                    result = ANALYZER.analyze(
                        img,
                        uncertainty_std_threshold=uncertainty_std_threshold,
                        entropy_norm_threshold=entropy_norm_threshold,
                        mc_runs=mc_runs,
                    )
                    rows.append(_result_to_row(Path(name).name, result))
                except Exception as exc:
                    rows.append({"filename": Path(name).name, "error": str(exc)})
    rows.sort(key=_batch_sort_key)
    return rows


def _parse_labels_csv(raw: bytes) -> Dict[str, int]:
    text = raw.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames:
        fn_key = None
        for candidate in ("filename", "file", "name", "image", "patch"):
            if candidate in reader.fieldnames:
                fn_key = candidate
                break
        if fn_key is None:
            fn_key = reader.fieldnames[0]
        label_key = None
        for candidate in ("label", "score", "intensity_score", "true_label", "her2", "grade"):
            if candidate in reader.fieldnames:
                label_key = candidate
                break
        if label_key is None and len(reader.fieldnames) > 1:
            label_key = reader.fieldnames[1]
        out: Dict[str, int] = {}
        for row in reader:
            if not row.get(fn_key):
                continue
            key = Path(row[fn_key].strip()).name
            val = row.get(label_key or "", "").strip()
            try:
                out[key] = int(float(val))
            except (TypeError, ValueError):
                continue
        return out
    return {}


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok" if ANALYZER.ready else "degraded",
        "model_loaded": ANALYZER.ready,
        "intensity_model_loaded": ANALYZER.intensity_model_loaded,
        "tissue_model_loaded": ANALYZER.tissue_model_loaded,
        "version": ANALYZER.version,
    }


@app.post("/analyze")
async def analyze(
    image: UploadFile = File(...),
    uncertainty_std_threshold: float = Form(DEFAULT_UNCERTAINTY_STD_THRESHOLD),
    entropy_norm_threshold: float = Form(DEFAULT_ENTROPY_NORM_THRESHOLD),
    mc_runs: int = Form(DEFAULT_MC_DROPOUT_RUNS),
    include_gradcam: str = Form("true"),
) -> Dict[str, Any]:
    _ensure_models_ready()
    if not image.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    _validate_image_filename(image.filename)
    mcr = max(1, min(32, int(mc_runs)))
    want_gradcam = _parse_form_bool(include_gradcam, default=True)

    raw = await image.read()
    img = _open_image_from_bytes(raw)

    result = ANALYZER.analyze(
        img,
        uncertainty_std_threshold=uncertainty_std_threshold,
        entropy_norm_threshold=entropy_norm_threshold,
        mc_runs=mcr,
    )

    heatmap_base64 = ""
    if want_gradcam:
        try:
            preprocessed = preprocess_pil_image(img)
            heatmap_base64 = generate_gradcam_overlay_base64(
                ANALYZER.intensity_model,
                preprocessed,
                img,
                class_idx=result.intensity_score,
            )
        except Exception:
            heatmap_base64 = ""

    return {
        "tissue_type": result.tissue_type,
        "tissue_confidence": round(result.tissue_confidence, 4),
        "intensity_score": result.intensity_score,
        "intensity_label": result.intensity_label,
        "confidence": round(result.confidence, 4),
        "needs_review": result.needs_review,
        "flag_for_review": result.needs_review,
        "uncertainty_std": round(result.uncertainty_std, 4),
        "uncertainty_combined": round(result.uncertainty_combined, 4),
        "prediction_entropy": round(result.prediction_entropy, 4),
        "intensity_probabilities": [round(p, 4) for p in result.intensity_probabilities],
        "stain_burden_0_100": round(result.stain_burden_0_100, 2),
        "non_tumor_context": result.non_tumor_context,
        "no_tumor_guidance": (
            "No tumor tissue detected in this patch—try selecting a tumor-rich ROI and rerun analysis."
            if result.non_tumor_context
            else ""
        ),
        "review_thresholds": {
            "uncertainty_std_threshold": round(float(uncertainty_std_threshold), 4),
            "entropy_norm_threshold": round(float(entropy_norm_threshold), 4),
        },
        "inference": {
            "mc_dropout_runs": mcr,
            "max_input_long_edge": PreprocessConfig().max_input_long_edge,
            "include_gradcam": want_gradcam,
        },
        "heatmap_base64": heatmap_base64,
    }


@app.post("/batch")
async def batch(
    zip_file: UploadFile = File(...),
    uncertainty_std_threshold: float = Form(DEFAULT_UNCERTAINTY_STD_THRESHOLD),
    entropy_norm_threshold: float = Form(DEFAULT_ENTROPY_NORM_THRESHOLD),
    mc_runs: int = Form(DEFAULT_MC_DROPOUT_RUNS),
) -> JSONResponse:
    _ensure_models_ready()
    if not zip_file.filename or Path(zip_file.filename).suffix.lower() != ".zip":
        raise HTTPException(status_code=400, detail="Upload a ZIP file.")

    mcr = max(1, min(32, int(mc_runs)))
    raw = await zip_file.read()
    rows = _rows_from_zip_bytes(
        raw, uncertainty_std_threshold, entropy_norm_threshold, mc_runs=mcr
    )

    csv_buf = io.StringIO()
    fieldnames = sorted({k for row in rows for k in row.keys()}) if rows else ["filename"]
    writer = csv.DictWriter(csv_buf, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(_row_for_csv(row))

    csv_b64 = base64.b64encode(csv_buf.getvalue().encode("utf-8")).decode("utf-8")
    return JSONResponse(
        {
            "count": len(rows),
            "results": rows,
            "csv_base64": csv_b64,
            "filename": "batch_results.csv",
            "review_thresholds": {
                "uncertainty_std_threshold": round(float(uncertainty_std_threshold), 4),
                "entropy_norm_threshold": round(float(entropy_norm_threshold), 4),
            },
        }
    )


@app.post("/case")
async def analyze_case(
    files: List[UploadFile] = File(...),
    case_id: str = Form(""),
    uncertainty_std_threshold: float = Form(DEFAULT_UNCERTAINTY_STD_THRESHOLD),
    entropy_norm_threshold: float = Form(DEFAULT_ENTROPY_NORM_THRESHOLD),
    mc_runs: int = Form(DEFAULT_MC_DROPOUT_RUNS),
) -> Dict[str, Any]:
    """Multi-image / ROI case: batch scoring + case-level summary for workflow."""
    _ensure_models_ready()
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one image for the case.")
    mcr = max(1, min(32, int(mc_runs)))

    rows: List[Dict[str, Any]] = []
    ok_scores: List[int] = []
    prob_matrix: List[List[float]] = []

    for uf in files:
        if not uf.filename:
            continue
        _validate_image_filename(uf.filename)
        raw = await uf.read()
        name = Path(uf.filename).name
        try:
            img = _open_image_from_bytes(raw)
            result = ANALYZER.analyze(
                img,
                uncertainty_std_threshold=uncertainty_std_threshold,
                entropy_norm_threshold=entropy_norm_threshold,
                mc_runs=mcr,
            )
            row = _result_to_row(name, result)
            rows.append(row)
            ok_scores.append(result.intensity_score)
            prob_matrix.append(list(result.intensity_probabilities))
        except Exception as exc:
            rows.append({"filename": name, "error": str(exc)})

    rows.sort(key=_batch_sort_key)
    n_ok = len(ok_scores)
    patch_dist = [0.0, 0.0, 0.0, 0.0]
    if n_ok:
        for s in ok_scores:
            patch_dist[s] += 1.0
        patch_dist = [round(100.0 * c / n_ok, 2) for c in patch_dist]
    mean_probs: List[float] = []
    if prob_matrix:
        arr = np.array(prob_matrix, dtype=np.float64)
        mean_probs = [round(float(x), 4) for x in arr.mean(axis=0)]

    suggested_score = 0
    if ok_scores:
        suggested_score = int(Counter(ok_scores).most_common(1)[0][0])
    soft_consensus_score = int(np.argmax(mean_probs)) if mean_probs else suggested_score

    needs_review_count = sum(1 for r in rows if r.get("needs_review") and not r.get("error"))
    needs_filenames = [r["filename"] for r in rows if r.get("needs_review") and not r.get("error")]

    summary = {
        "case_id": case_id or "",
        "n_images": len(files),
        "n_analyzed_ok": n_ok,
        "patch_score_distribution_pct": {
            "0": patch_dist[0],
            "1+": patch_dist[1],
            "2+": patch_dist[2],
            "3+": patch_dist[3],
        },
        "mean_intensity_probabilities": mean_probs,
        "suggested_final_score": suggested_score,
        "suggested_final_label": INTENSITY_LABELS.get(suggested_score, str(suggested_score)),
        "soft_consensus_score": soft_consensus_score,
        "soft_consensus_label": INTENSITY_LABELS.get(soft_consensus_score, str(soft_consensus_score)),
        "needs_review_count": needs_review_count,
        "needs_review_filenames": needs_filenames,
        "any_region_needs_review": needs_review_count > 0,
    }

    csv_buf = io.StringIO()
    fieldnames = sorted({k for row in rows for k in row.keys()}) if rows else ["filename"]
    writer = csv.DictWriter(csv_buf, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(_row_for_csv(row))
    csv_b64 = base64.b64encode(csv_buf.getvalue().encode("utf-8")).decode("utf-8")

    return {
        "summary": summary,
        "results": rows,
        "csv_base64": csv_b64,
        "filename": f"case_{case_id or 'export'}.csv",
        "review_thresholds": {
            "uncertainty_std_threshold": round(float(uncertainty_std_threshold), 4),
            "entropy_norm_threshold": round(float(entropy_norm_threshold), 4),
        },
    }


@app.post("/benchmark")
async def benchmark(
    zip_file: UploadFile = File(...),
    labels_csv: Annotated[Optional[UploadFile], File()] = None,
    uncertainty_std_threshold: float = Form(DEFAULT_UNCERTAINTY_STD_THRESHOLD),
    entropy_norm_threshold: float = Form(DEFAULT_ENTROPY_NORM_THRESHOLD),
    mc_runs: int = Form(DEFAULT_MC_DROPOUT_RUNS),
) -> Dict[str, Any]:
    """ZIP of patches + optional pathologist labels CSV → agreement metrics for internal validation."""
    _ensure_models_ready()
    if not zip_file.filename or Path(zip_file.filename).suffix.lower() != ".zip":
        raise HTTPException(status_code=400, detail="Upload a ZIP file of images.")
    mcr = max(1, min(32, int(mc_runs)))

    raw = await zip_file.read()
    rows = _rows_from_zip_bytes(
        raw, uncertainty_std_threshold, entropy_norm_threshold, mc_runs=mcr
    )

    out: Dict[str, Any] = {
        "count": len(rows),
        "predictions": rows,
        "metrics": None,
        "labels_note": "Upload labels_csv with columns filename,label (integers 0–3) to compute kappa and confusion matrix.",
    }

    if not labels_csv or not labels_csv.filename:
        return out

    label_bytes = await labels_csv.read()
    label_map = _parse_labels_csv(label_bytes)
    if not label_map:
        out["labels_note"] = "Could not parse labels CSV. Use header row with filename and label (0–3)."
        return out

    y_true: List[int] = []
    y_pred: List[int] = []
    matched_files: List[str] = []
    for r in rows:
        if r.get("error"):
            continue
        fn = r.get("filename", "")
        if fn not in label_map:
            continue
        y_true.append(int(label_map[fn]))
        y_pred.append(int(r["intensity_score"]))
        matched_files.append(fn)

    if len(y_true) < 2:
        out["labels_note"] = f"Only {len(y_true)} rows matched labels by filename; need at least 2 for kappa."
        out["matched_count"] = len(y_true)
        return out

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2, 3])
    kappa_raw = cohen_kappa_score(y_true, y_pred, weights=None)
    kappa = float(kappa_raw) if not np.isnan(kappa_raw) else 1.0
    exact = float(np.mean(np.array(y_true) == np.array(y_pred)))
    within_one = float(np.mean(np.abs(np.array(y_true) - np.array(y_pred)) <= 1))

    out["metrics"] = {
        "n_matched": len(y_true),
        "cohen_kappa": round(kappa, 4),
        "accuracy_exact": round(exact, 4),
        "accuracy_within_1": round(within_one, 4),
        "confusion_matrix": cm.tolist(),
        "confusion_labels": [0, 1, 2, 3],
        "matched_filenames": matched_files,
    }
    out["labels_note"] = ""
    return out


class FeedbackPayload(BaseModel):
    predicted_intensity_score: int = Field(ge=0, le=3)
    corrected_intensity_score: int = Field(ge=0, le=3)
    confidence: float = Field(ge=0.0, le=1.0)
    uncertainty_combined: float = Field(ge=0.0)
    tissue_type: str = ""
    note: str = ""
    source: str = "results_page"
    image_name: str = ""
    case_id: str = ""
    reviewed_by: str = ""
    final_review: bool = False


@app.post("/feedback")
async def feedback(payload: FeedbackPayload) -> Dict[str, Any]:
    FEEDBACK_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat()
    row = payload.model_dump()
    row["timestamp"] = ts

    feedback_fields = [
        "timestamp",
        "predicted_intensity_score",
        "corrected_intensity_score",
        "confidence",
        "uncertainty_combined",
        "tissue_type",
        "note",
        "source",
        "image_name",
        "case_id",
        "reviewed_by",
        "final_review",
        "disagreement",
    ]
    disagree = int(row["predicted_intensity_score"] != row["corrected_intensity_score"])
    row["disagreement"] = disagree

    new_file = not FEEDBACK_CSV_PATH.exists()
    with FEEDBACK_CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=feedback_fields)
        if new_file:
            writer.writeheader()
        writer.writerow({k: row.get(k, "") for k in feedback_fields})

    audit_new = not AUDIT_CSV_PATH.exists()
    with AUDIT_CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        awriter = csv.DictWriter(
            f,
            fieldnames=[
                "timestamp",
                "action",
                "reviewed_by",
                "case_id",
                "image_name",
                "predicted_intensity_score",
                "corrected_intensity_score",
                "final_review",
                "note",
            ],
        )
        if audit_new:
            awriter.writeheader()
        awriter.writerow(
            {
                "timestamp": ts,
                "action": "score_correction",
                "reviewed_by": row.get("reviewed_by", ""),
                "case_id": row.get("case_id", ""),
                "image_name": row.get("image_name", ""),
                "predicted_intensity_score": row["predicted_intensity_score"],
                "corrected_intensity_score": row["corrected_intensity_score"],
                "final_review": row.get("final_review", False),
                "note": row.get("note", ""),
            }
        )

    return {
        "status": "ok",
        "saved_to": str(FEEDBACK_CSV_PATH),
        "audit_log": str(AUDIT_CSV_PATH),
        "model_vs_pathologist_disagreement": bool(disagree),
    }
