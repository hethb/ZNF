# Dataset Structure

Store intensity training images under:

- `data/0_negative/`
- `data/1_weak/`
- `data/2_moderate/`
- `data/3_strong/`

Supported formats: `.jpg`, `.jpeg`, `.png`.

Optional: create a separate tissue dataset for tumor-vs-nontumor classification to train and save `best_tissue_model.keras` in `backend/model/artifacts/`.

Recommended tissue dataset structure:

- `data/tissue/tumor/`
- `data/tissue/stroma/`
- `data/tissue/adipose/`
- `data/tissue/lympho/`
- `data/tissue/mucosa/`
- `data/tissue/debris/`
- `data/tissue/empty/`
- `data/tissue/complex/`
