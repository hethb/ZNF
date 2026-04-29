# Public datasets for real IHC / histology demos

The repo ships a **synthetic bootstrap** (`scripts/bootstrap_minimal_demo.py`) so the stack runs end-to-end on a fresh clone. For YC, diligence, or clinical credibility, **replace it with public data** and retrain using `backend.model.train` and `backend.model.train_tissue`.

Below are **starting points** (verify licenses, attribution, and whether labels match your 0–3+ schema). URLs change; search the dataset name if a link rots.

---

## IHC-relevant or pathology patch tasks

| Name | Notes |
|------|--------|
| **CAMELYON16 / 17** | Lymph node metastasis in **H&E** WSI—not IHC, but standard for patch CNN demos and transfer to your heads. |
| **PatchCamelyon (PCam)** | Binary tumor patch classification on **H&E**; good for pretraining or tissue-style heads. |
| **BACH / ICIAR 2018** | Breast histology **H&E** four-class; again not IHC, useful for tissue/texture pretraining. |
| **TUPAC16 (HER2 scoring challenge)** | Public challenge used for HER2 score prediction from histopathology; strong candidate for replacing synthetic demo weights with a real 0/1+/2+/3-style benchmark run. |
| **Kaggle “HER2” / breast IHC** | Search Kaggle for **HER2 scoring** or **IHC** challenges; several competitions use patch or ROI images with score labels—read rules for commercial use. |
| **TCIA / TCGA** | Diagnostic slides exist for many cancers; **IHC is not universal** across all slide types; TCGA requires controlled access for some data. Use GDC Data Portal + pathology slide companions where available. |
| **TIGER** (example challenge space) | Search for **grand challenges** in computational pathology; some provide ROI-level labels suitable for weak supervision or patch models. |

---

## Mapping external labels to PathIQ folders

Intensity training expects:

- `data/0_negative/`
- `data/1_weak/`
- `data/2_moderate/`
- `data/3_strong/`

Map HER2 0/1+/2+/3+ (or analogous) directly. For non-four-tier tasks, either **collapse labels** (document the mapping) or extend the model head (code change).

Tissue head expects subfolders under `data/tissue/` named exactly:

`tumor`, `stroma`, `adipose`, `lympho`, `mucosa`, `debris`, `empty`, `complex`

You can **merge** rare classes into `complex` or `empty` if your public set does not distinguish them.

---

## Suggested “minimum credible” public demo

1. Download a **HER2-labeled patch set** (or extract ROIs from WSIs under the dataset license).
2. Hold out 15–20% for a test confusion matrix; train with `python -m backend.model.train ...`.
3. Save artifacts to `backend/model/artifacts/` and record **n, label distribution, and kappa** in the README.

This directly answers “can I try it on something real?” better than synthetic pink noise.

---

## Training scaffold in this repo

Use `scripts/train_public_her2.py` with a simple manifest CSV (template: `scripts/manifest_template.csv`):

```csv
image_path,label,tissue_label
patches/case01_roi01.png,2+,tumor
patches/case01_roi02.png,1+,stroma
```

Run:

```bash
source backend/.venv/bin/activate
python scripts/train_public_her2.py \
  --manifest_csv /absolute/path/to/manifest.csv \
  --source_root /absolute/path/to/dataset_root \
  --staging_dir data/public_her2_staged \
  --artifacts backend/model/artifacts
```

This stages data into PathIQ folder layout and launches `train.py` (and `train_tissue.py` if `tissue_label` is provided).

One-command wrapper:

```bash
bash scripts/run_public_her2.sh /absolute/path/to/manifest.csv /absolute/path/to/dataset_root
```

Override epochs if needed:

```bash
INTENSITY_EPOCHS=30 TISSUE_EPOCHS=16 BATCH_SIZE=12 \
bash scripts/run_public_her2.sh /absolute/path/to/manifest.csv /absolute/path/to/dataset_root
```
