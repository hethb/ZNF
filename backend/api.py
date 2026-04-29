from __future__ import annotations

import base64
import csv
import io
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel, Field

from backend.model.ihc_analyzer import IHCAnalyzer
from backend.utils.gradcam import generate_gradcam_overlay_base64
from backend.utils.preprocessing import PreprocessConfig, preprocess_pil_image

app = FastAPI(title="PathIQ API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANALYZER = IHCAnalyzer(
    intensity_model_path=Path("backend/model/artifacts/best_intensity_model.keras"),
    tissue_model_path=Path("backend/model/artifacts/best_tissue_model.keras"),
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
DEFAULT_UNCERTAINTY_STD_THRESHOLD = 0.14
DEFAULT_ENTROPY_NORM_THRESHOLD = 0.62
FEEDBACK_CSV_PATH = Path("data/feedback/prediction_feedback.csv")


def _validate_image_filename(filename: str) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Upload JPG or PNG.")


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

    if img.width < PreprocessConfig().min_size[0] or img.height < PreprocessConfig().min_size[1]:
        raise HTTPException(status_code=400, detail="Image too small. Minimum size is 64x64.")
    return img


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
) -> Dict[str, Any]:
    _ensure_models_ready()
    if not image.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    _validate_image_filename(image.filename)

    raw = await image.read()
    img = _open_image_from_bytes(raw)

    result = ANALYZER.analyze(
        img,
        uncertainty_std_threshold=uncertainty_std_threshold,
        entropy_norm_threshold=entropy_norm_threshold,
    )

    heatmap_base64 = ""
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
        "heatmap_base64": heatmap_base64,
    }


@app.post("/batch")
async def batch(
    zip_file: UploadFile = File(...),
    uncertainty_std_threshold: float = Form(DEFAULT_UNCERTAINTY_STD_THRESHOLD),
    entropy_norm_threshold: float = Form(DEFAULT_ENTROPY_NORM_THRESHOLD),
) -> JSONResponse:
    _ensure_models_ready()
    if not zip_file.filename or Path(zip_file.filename).suffix.lower() != ".zip":
        raise HTTPException(status_code=400, detail="Upload a ZIP file.")

    raw = await zip_file.read()
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
                    )
                    rows.append(
                        {
                            "filename": Path(name).name,
                            "tissue_type": result.tissue_type,
                            "tissue_confidence": round(result.tissue_confidence, 4),
                            "intensity_score": result.intensity_score,
                            "intensity_label": result.intensity_label,
                            "confidence": round(result.confidence, 4),
                            "uncertainty_std": round(result.uncertainty_std, 4),
                            "uncertainty_combined": round(result.uncertainty_combined, 4),
                            "stain_burden_0_100": round(result.stain_burden_0_100, 2),
                            "non_tumor_context": result.non_tumor_context,
                            "needs_review": result.needs_review,
                            "flag_for_review": result.needs_review,
                        }
                    )
                except Exception as exc:
                    rows.append(
                        {
                            "filename": Path(name).name,
                            "error": str(exc),
                        }
                    )

    # Default batch workflow: surface uncertain cases first.
    rows = sorted(rows, key=lambda r: float(r.get("confidence", 1.0)))

    csv_buf = io.StringIO()
    fieldnames = sorted({k for row in rows for k in row.keys()}) if rows else ["filename"]
    writer = csv.DictWriter(csv_buf, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

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


class FeedbackPayload(BaseModel):
    predicted_intensity_score: int = Field(ge=0, le=3)
    corrected_intensity_score: int = Field(ge=0, le=3)
    confidence: float = Field(ge=0.0, le=1.0)
    uncertainty_combined: float = Field(ge=0.0)
    tissue_type: str = ""
    note: str = ""
    source: str = "results_page"
    image_name: str = ""


@app.post("/feedback")
async def feedback(payload: FeedbackPayload) -> Dict[str, Any]:
    FEEDBACK_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    new_file = not FEEDBACK_CSV_PATH.exists()
    with FEEDBACK_CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "predicted_intensity_score",
                "corrected_intensity_score",
                "confidence",
                "uncertainty_combined",
                "tissue_type",
                "note",
                "source",
                "image_name",
            ],
        )
        if new_file:
            writer.writeheader()
        writer.writerow(payload.model_dump())

    return {"status": "ok", "saved_to": str(FEEDBACK_CSV_PATH)}
