from __future__ import annotations

import base64
import csv
import io
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

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
async def analyze(image: UploadFile = File(...)) -> Dict[str, Any]:
    _ensure_models_ready()
    if not image.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    _validate_image_filename(image.filename)

    raw = await image.read()
    img = _open_image_from_bytes(raw)

    result = ANALYZER.analyze(img)

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
        "uncertainty_std": round(result.uncertainty_std, 4),
        "uncertainty_combined": round(result.uncertainty_combined, 4),
        "prediction_entropy": round(result.prediction_entropy, 4),
        "intensity_probabilities": [round(p, 4) for p in result.intensity_probabilities],
        "stain_burden_0_100": round(result.stain_burden_0_100, 2),
        "non_tumor_context": result.non_tumor_context,
        "heatmap_base64": heatmap_base64,
    }


@app.post("/batch")
async def batch(zip_file: UploadFile = File(...)) -> JSONResponse:
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
                    result = ANALYZER.analyze(img)
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
                        }
                    )
                except Exception as exc:
                    rows.append(
                        {
                            "filename": Path(name).name,
                            "error": str(exc),
                        }
                    )

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
        }
    )
