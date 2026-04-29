# PathIQ

**Problem first:** pathology demand is rising faster than diagnostic capacity. WHO/IARC estimates **20M** new cancer cases in 2022 and projects **35M by 2050 (+77%)**, increasing downstream pathology workload ([IARC, 2024](https://www.iarc.who.int/wp-content/uploads/2024/02/pr345_E.pdf)). On workforce, CAP-backed modeling literature estimated US pathologist supply could decline from ~17,500 FTE (2010) to ~14,000 by 2030 if training/replacement dynamics stay constrained ([Arch Pathol Lab Med, 2015](https://meridian.allenpress.com/aplm/article/139/11/1413/132505/The-Pathologist-Workforce-in-the-United-States-II)); CAP continues to flag demand outpacing supply ([CAP, 2026](https://www.cap.org/advocacy/latest-news-and-practice-data/cap-engages-with-hrsa-on-pathologist-workforce-projections)).

PathIQ is decision-support software for IHC: tissue context, intensity scoring, uncertainty, and Grad-CAM overlays so experts spend time on judgment, not repetitive counting.

**Origin story (not the product boundary):** the stack began with ZNF835 research, then generalized to **any biomarker**.

**Business model, pricing test range, GTM, regulatory framing, and pathologist outreach tracker:** see **[BUSINESS.md](./BUSINESS.md)**.

**Public data for a real demo:** see **[docs/PUBLIC_IHC_DATASETS.md](./docs/PUBLIC_IHC_DATASETS.md)** (includes TUPAC16/HER2 pointers). Ship a live demo before investor outreach: run the bootstrap script below, open **`/demo`**, then replace synthetic weights with a public IHC run.

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

`bootstrap_minimal_demo.py` builds a tiny synthetic dataset and trains `.keras` checkpoints so the app runs from a fresh clone. **This is demo infrastructure, not model validation.** Replace with a public HER2/IHC cohort before investor claims.

For real-data training, use `scripts/train_public_her2.py` with a manifest CSV (see dataset doc).

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

## Pre-fundraise checklist (high priority)

- [ ] Train and ship **real** weights from a public IHC cohort (recommended first target: TUPAC16/HER2-style labels).
- [ ] Manually review **20–30 Grad-CAM overlays** on real slides and verify activations are anatomically sensible.
- [ ] Capture one pathologist usage signal (email/quote/LOI) and paste into `BUSINESS.md`.
- [ ] Rename repo from `ZNF` to `pathiq` in GitHub settings before sharing investor links.

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
