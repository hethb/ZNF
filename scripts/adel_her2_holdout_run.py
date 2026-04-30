#!/usr/bin/env python3
"""
End-to-end ADEL HER2 training + holdout metrics (works around Keras 3 edge cases
when the full train module is loaded as main). Invoked from train_public_her2 or manually:

  backend/.venv/bin/python scripts/adel_her2_holdout_run.py [epochs]

Writes results/her2_holdout_metrics.txt and model artifacts to backend/model/artifacts/.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ensure matplotlib cache is writable (e.g. CI)
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".mpl_cache"))

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split

from backend.model import train as trainmod
from backend.utils.preprocessing import preprocess_pil_image


def main() -> int:
    epochs = 12
    if len(sys.argv) > 1:
        epochs = int(sys.argv[1])
    out_dir = ROOT / "backend" / "model" / "artifacts"
    out_dir.mkdir(parents=True, exist_ok=True)
    (ROOT / "results").mkdir(exist_ok=True)

    # Fresh TF process — avoid mixing with anything else
    from PIL import Image

    data_dir = ROOT / "data" / "public_her2_staged"
    image_paths, labels = trainmod.collect_dataset(data_dir)
    n = len(image_paths)
    if n < 40:
        print("Need ADEL data staged; run: python scripts/train_public_her2.py ...", file=sys.stderr)
        return 1

    print(f"ADEL run: n={n} patches, epochs={epochs}", flush=True)
    y_int = np.array(labels, dtype=np.int32)
    X = np.empty((n, 224, 224, 3), dtype=np.float32)
    for i, p in enumerate(image_paths):
        with Image.open(p) as im:
            X[i] = preprocess_pil_image(im.convert("RGB"))[0]
    y_oh = tf.keras.utils.to_categorical(y_int, 4)

    idx = np.arange(n)
    i_train, i_rem = train_test_split(idx, test_size=0.3, random_state=42, stratify=y_int)
    y_rem = y_int[i_rem]
    i_val, i_test = train_test_split(i_rem, test_size=0.5, random_state=42, stratify=y_rem)
    X_tr, y_tr = X[i_train], y_oh[i_train]
    X_val, y_val = X[i_val], y_oh[i_val]
    X_te, y_te = X[i_test], y_oh[i_test]

    batch = 16
    model = trainmod.build_model()
    val_data = (X_val, y_val)
    callbacks: list[tf.keras.callbacks.Callback] = [
        trainmod.ClinicalMetricsNumpyCallback(X_val, y_val, batch),
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(out_dir / "best_intensity_model.keras"),
            monitor="val_loss",
            save_best_only=True,
        ),
    ]
    e1 = max(1, int(epochs * 0.7))
    e2 = max(1, epochs - max(1, int(epochs * 0.7)))
    _ = model.fit(
        X_tr,
        y_tr,
        batch_size=batch,
        validation_data=val_data,
        epochs=e1,
        callbacks=callbacks,
        verbose=1,
        shuffle=True,
    )
    trainmod.fine_tune_model(model, unfreeze_layers=30)
    _ = model.fit(
        X_tr,
        y_tr,
        batch_size=batch,
        validation_data=val_data,
        epochs=e2,
        callbacks=callbacks,
        verbose=1,
        shuffle=True,
    )
    note = "ADEL HER2 IHC (Zenodo 10.5281/zenodo.15872690), 418 PNG, HER2score 0-3. Script: scripts/adel_her2_holdout_run.py"
    out_metrics = ROOT / "results" / "her2_holdout_metrics.txt"
    trainmod.evaluate_and_export_arrays(
        model,
        X_te,
        y_te,
        batch,
        out_dir,
        clinical_metrics_path=out_metrics,
        metrics_header_note=note,
    )
    print(f"Wrote {out_metrics}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
