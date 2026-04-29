# PathIQ MVP

PathIQ is an AI-powered immunohistochemistry (IHC) slide analysis prototype designed to help pathologists reduce manual 0/1+/2+/3+ intensity scoring time using transfer-learned CNNs, uncertainty-aware predictions, and Grad-CAM visual explanations in a clinical-style web workflow.

## Backend Setup (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
uvicorn backend.api:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

## Frontend Setup (React + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173` by default.

## Model Training

1. Arrange your dataset as:
   - `data/0_negative/`
   - `data/1_weak/`
   - `data/2_moderate/`
   - `data/3_strong/`
2. Train intensity model:

```bash
python -m backend.model.train --data_dir data --output_dir backend/model/artifacts --epochs 25
```

3. Train tissue classifier model (required by `/analyze` and `/batch`):

```bash
python -m backend.model.train_tissue --data_dir data/tissue --output_dir backend/model/artifacts --epochs 20
```

Training artifacts:
- `backend/model/artifacts/best_intensity_model.keras`
- `backend/model/artifacts/best_tissue_model.keras`
- `backend/model/artifacts/training_curves.png`
- `backend/model/artifacts/confusion_matrix.png`
- `backend/model/artifacts/classification_report.txt`

Clinical metrics tracked per epoch:
- Exact agreement (%)
- Within-1 agreement (%)
- Weighted linear Cohen's kappa

## Single-image Inference via curl

```bash
curl -X POST "http://127.0.0.1:8000/analyze" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/absolute/path/to/slide.png"
```

## API Endpoints

- `GET /health` - model health/version
- `POST /analyze` - single image pipeline (tissue classification -> intensity + MC dropout confidence + Grad-CAM)
- `POST /batch` - ZIP batch analysis with CSV-exportable summary payload

## Clinical Validation Status

This software is a research prototype for exploratory and educational use only. It is **not** FDA-cleared, is **not** validated for clinical diagnosis, and must not be used as a standalone medical decision system.
