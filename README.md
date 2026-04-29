# PathIQ

**Problem first:** pathology labs are drowning in **IHC and digital slide volume** while pathologist capacity lags demand in many markets. Manual 0/1+/2+/3+ scoring is slow, variable between readers, and does not scale with biomarker panel growth. **PathIQ** is decision-support software: tissue-aware patch scoring, uncertainty, and Grad-CAM-style overlays so experts spend time on judgment, not pixel counting.

**Origin story (not the product boundary):** the stack is grounded in published research on **ZNF835**, gene regulation, and **AI-enhanced IHC**—then **generalized to any biomarker** the lab runs.

**Business, pricing sketch, GTM, regulatory framing, and pathologist LOI template:** see **[BUSINESS.md](./BUSINESS.md)** (YC-oriented outline; validate numbers and claims before fundraising).

**Public data for a “real” demo:** see **[docs/PUBLIC_IHC_DATASETS.md](./docs/PUBLIC_IHC_DATASETS.md)** (HER2 challenges, H&E patch corpora, TCGA/TCIA pointers). **Ship a live demo before perfect copy:** run the bootstrap script below, open **`/demo`** in the UI, record a 90-second Loom.

---

## Try it in two minutes (synthetic weights, end-to-end)

Model artifacts are **gitignored**. After clone, from the **repository root**:

```bash
cd backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ..
python scripts/bootstrap_minimal_demo.py
uvicorn backend.api:app --reload
```

In another terminal:

```bash
cd frontend && npm install && npm run dev
```

- API: `http://127.0.0.1:8000` (docs at `/docs`)
- UI: `http://127.0.0.1:5173` — use **`/demo`** for four preloaded patches (no upload), or **`/analyze`** for your own JPG/PNG.

`bootstrap_minimal_demo.py` builds a tiny synthetic dataset and trains **real** `.keras` checkpoints so partners can click the product. **Replace with public IHC labels** before clinical or investor claims.

---

## Tech stack (second in the pitch deck)

- **Backend:** FastAPI — `GET /health`, `POST /analyze`, `POST /batch`
- **Models:** MobileNetV2 heads, Monte Carlo dropout uncertainty, Grad-CAM-style maps (see `backend/utils/gradcam.py`)
- **Training:** `python -m backend.model.train`, `python -m backend.model.train_tissue` (clinical metrics, confusion matrix export)

Dataset layout for your own labels:

- Intensity: `data/0_negative/`, `data/1_weak/`, `data/2_moderate/`, `data/3_strong/`
- Tissue: `data/tissue/<tumor|stroma|...>/`

### Reference notebook (gist)

The linked [gist](https://gist.github.com/hethb/8dc94ff3fb3cc1ca911bd766000d5c7e) is a **tabular** sklearn teaching notebook (not IHC images). It is useful for **metrics literacy**; patch training entry points are the `backend.model.*` modules above.

---

## Regulatory (investor table stakes — not legal advice)

PathIQ is positioned as **clinical decision support**, not a standalone diagnostic. For U.S. commercialization, **device classification and CDS policy** depend on exact indications, UX, and labeling; many imaging products pursue **510(k)** when they qualify as devices. **Engage FDA-qualified regulatory counsel** early; timelines are **order-of-magnitude** (often discussed as ~12–18 months for moderate-risk 510(k) programs vs multi-year PMA-class work for novel Class III diagnostics). Do not ship to patients based on this README alone.

---

## curl

```bash
curl -s http://127.0.0.1:8000/health
curl -X POST "http://127.0.0.1:8000/analyze" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/absolute/path/to/slide.png"
```

---

## Demo assets

- **`frontend/public/demo/slide1.png` … `slide4.png`** — generated via `python scripts/generate_synthetic_patch.py` (committed for static hosting). Re-run bootstrap to refresh from training patches if desired.

---

## Status

Research / educational prototype. **Not FDA-cleared.** Not validated for clinical diagnosis. Use only with appropriate oversight and labeling.
