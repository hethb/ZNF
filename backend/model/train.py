from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import tensorflow as tf
from PIL import Image
from sklearn.metrics import (
    classification_report,
    cohen_kappa_score,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split

from backend.model.ihc_analyzer import DataGenerator
from backend.utils.preprocessing import preprocess_pil_image

# Keras 3 + PyDataset `fit(Sequence, ...)` can hang on some stacks; the numpy path is reliable
# for typical public IHC patch cohorts (thousands of images at 224px).
_NUMPY_FIT_MAX_SAMPLES: int = 10_000

LABEL_MAP: Dict[str, int] = {
    "0_negative": 0,
    "1_weak": 1,
    "2_moderate": 2,
    "3_strong": 3,
}


class ClinicalMetricsCallback(tf.keras.callbacks.Callback):
    def __init__(self, val_data: DataGenerator) -> None:
        super().__init__()
        self.val_data = val_data

    def on_epoch_end(self, epoch: int, logs: dict | None = None) -> None:
        y_true: List[int] = []
        y_pred: List[int] = []
        # Do not `for batch in sequence` — Keras Sequences are not bounded iterators.
        for i in range(len(self.val_data)):
            x_batch, y_batch = self.val_data[i]
            pred = self.model.predict(x_batch, verbose=0)
            y_true.extend(np.argmax(y_batch, axis=1))
            y_pred.extend(np.argmax(pred, axis=1))

        y_true_np = np.array(y_true)
        y_pred_np = np.array(y_pred)

        exact = float(np.mean(y_true_np == y_pred_np))
        within1 = float(np.mean(np.abs(y_true_np - y_pred_np) <= 1))
        kappa = float(cohen_kappa_score(y_true_np, y_pred_np, weights="linear"))

        print(
            f"\nClinical metrics - epoch {epoch + 1}: "
            f"exact={exact:.3f}, within_1={within1:.3f}, weighted_kappa={kappa:.3f}"
        )


class ClinicalMetricsNumpyCallback(tf.keras.callbacks.Callback):
    """Validation metrics for in-memory (X, y_oh) validation sets."""

    def __init__(self, x_val: np.ndarray, y_val_oh: np.ndarray, batch_size: int) -> None:
        super().__init__()
        self._x_val = x_val
        self._y_val_oh = y_val_oh
        self._batch_size = max(1, int(batch_size))

    def on_epoch_end(self, epoch: int, logs: dict | None = None) -> None:
        pred = self.model.predict(self._x_val, batch_size=self._batch_size, verbose=0)
        y_true_np = np.argmax(self._y_val_oh, axis=1)
        y_pred_np = np.argmax(pred, axis=1)
        exact = float(np.mean(y_true_np == y_pred_np))
        within1 = float(np.mean(np.abs(y_true_np - y_pred_np) <= 1))
        kappa = float(cohen_kappa_score(y_true_np, y_pred_np, weights="linear"))
        print(
            f"\nClinical metrics - epoch {epoch + 1}: "
            f"exact={exact:.3f}, within_1={within1:.3f}, weighted_kappa={kappa:.3f}"
        )


def load_intensity_stack(
    image_paths: List[Path], labels: List[int]
) -> tuple[np.ndarray, np.ndarray]:
    n = len(image_paths)
    x = np.empty((n, 224, 224, 3), dtype=np.float32)
    y = np.array(labels, dtype=np.int32)
    for i, p in enumerate(image_paths):
        with Image.open(p) as im:
            x[i] = preprocess_pil_image(im.convert("RGB"))[0]
    return x, y


def collect_dataset(data_dir: Path) -> Tuple[List[Path], List[int]]:
    image_paths: List[Path] = []
    labels: List[int] = []
    for class_name, class_idx in LABEL_MAP.items():
        class_dir = data_dir / class_name
        if not class_dir.exists():
            continue
        for ext in ("*.jpg", "*.jpeg", "*.png"):
            for p in class_dir.glob(ext):
                image_paths.append(p)
                labels.append(class_idx)
    return image_paths, labels


def plot_training_curves(history: tf.keras.callbacks.History, output_dir: Path) -> None:
    import matplotlib.pyplot as plt

    output_dir.mkdir(parents=True, exist_ok=True)
    plt.figure(figsize=(8, 4))
    plt.plot(history.history.get("loss", []), label="train_loss")
    plt.plot(history.history.get("val_loss", []), label="val_loss")
    plt.title("Training Curves")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_dir / "training_curves.png", dpi=200)
    plt.close()


def _export_from_predictions(
    y_true_np: np.ndarray,
    y_pred_np: np.ndarray,
    output_dir: Path,
    clinical_metrics_path: Optional[Path] = None,
    metrics_header_note: str = "",
) -> None:
    import matplotlib.pyplot as plt
    import seaborn as sns

    cm = confusion_matrix(y_true_np, y_pred_np, labels=[0, 1, 2, 3])
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", cbar=False)
    plt.title("Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("True")
    plt.tight_layout()
    plt.savefig(output_dir / "confusion_matrix.png", dpi=200)
    plt.close()

    report = classification_report(y_true_np, y_pred_np, digits=3)
    prec_m, rec_m, f1_m, _ = precision_recall_fscore_support(
        y_true_np, y_pred_np, average="macro", zero_division=0
    )
    macro_block = (
        f"\nMacro (unweighted class mean): precision={prec_m:.4f}, "
        f"recall={rec_m:.4f}, f1={f1_m:.4f}\n"
    )
    exact = float(np.mean(y_true_np == y_pred_np))
    within1 = float(np.mean(np.abs(y_true_np - y_pred_np) <= 1))
    kappa = float(cohen_kappa_score(y_true_np, y_pred_np, weights="linear"))

    print("\nHeld-out test classification report:\n")
    print(report)
    print(macro_block)
    print(
        f"\nHoldout (test split): exact_agreement={exact:.4f}, "
        f"within_1_agreement={within1:.4f}, cohens_kappa_linear={kappa:.4f}\n"
    )
    (output_dir / "classification_report.txt").write_text(report + macro_block)

    if clinical_metrics_path is not None:
        clinical_metrics_path.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            "# PathIQ intensity classifier — held-out test split",
            "# Split: train_test_split(test_size=0.3) then val/test on the 30% half; "
            "test is 15% of all patches (stratified, random_state=42).",
            f"# Written (UTC): {datetime.now(timezone.utc).isoformat()}",
        ]
        if metrics_header_note.strip():
            lines.append(f"# {metrics_header_note.strip()}")
        lines.extend(
            [
                f"n_test_patches: {len(y_true_np)}",
                f"exact_agreement: {exact:.6f}",
                f"within_1_agreement: {within1:.6f}",
                f"cohens_kappa_linear: {kappa:.6f}",
            ]
        )
        clinical_metrics_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def evaluate_and_export(
    model: tf.keras.Model,
    test_gen: DataGenerator,
    output_dir: Path,
    clinical_metrics_path: Optional[Path] = None,
    metrics_header_note: str = "",
) -> None:
    y_true: List[int] = []
    y_pred: List[int] = []
    for i in range(len(test_gen)):
        x_batch, y_batch = test_gen[i]
        pred = model.predict(x_batch, verbose=0)
        y_true.extend(np.argmax(y_batch, axis=1))
        y_pred.extend(np.argmax(pred, axis=1))
    y_true_np = np.array(y_true, dtype=np.int32)
    y_pred_np = np.array(y_pred, dtype=np.int32)
    _export_from_predictions(
        y_true_np,
        y_pred_np,
        output_dir,
        clinical_metrics_path=clinical_metrics_path,
        metrics_header_note=metrics_header_note,
    )


def evaluate_and_export_arrays(
    model: tf.keras.Model,
    x_test: np.ndarray,
    y_test_oh: np.ndarray,
    batch_size: int,
    output_dir: Path,
    clinical_metrics_path: Optional[Path] = None,
    metrics_header_note: str = "",
) -> None:
    pred = model.predict(x_test, batch_size=max(1, int(batch_size)), verbose=0)
    y_true_np = np.argmax(y_test_oh, axis=1)
    y_pred_np = np.argmax(pred, axis=1)
    _export_from_predictions(
        y_true_np,
        y_pred_np,
        output_dir,
        clinical_metrics_path=clinical_metrics_path,
        metrics_header_note=metrics_header_note,
    )


def build_model() -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3), include_top=False, weights="imagenet"
    )
    base.trainable = False

    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = base(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.35)(x)
    outputs = tf.keras.layers.Dense(4, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def fine_tune_model(model: tf.keras.Model, unfreeze_layers: int = 30) -> None:
    base_model = model.layers[1]
    base_model.trainable = True
    for layer in base_model.layers[:-unfreeze_layers]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", type=Path, default=Path("data"))
    parser.add_argument("--output_dir", type=Path, default=Path("backend/model/artifacts"))
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument(
        "--clinical_metrics_path",
        type=Path,
        default=None,
        help="If set, write holdout exact / within-1 / linear-weighted Cohen's kappa to this file.",
    )
    parser.add_argument(
        "--clinical_metrics_note",
        type=str,
        default="",
        help="Optional single-line note embedded in the metrics file header.",
    )
    args = parser.parse_args()

    image_paths, labels = collect_dataset(args.data_dir)
    if not image_paths:
        raise ValueError("No training images found. Check data directory structure.")
    n_samples = len(image_paths)
    metrics_header_note = args.clinical_metrics_note or f"data_dir={args.data_dir.resolve()}"
    use_numpy_fit = n_samples < _NUMPY_FIT_MAX_SAMPLES

    args.output_dir.mkdir(parents=True, exist_ok=True)
    y_int = np.array(labels, dtype=np.int32)
    if use_numpy_fit:
        X, _ = load_intensity_stack(image_paths, labels)
        model = build_model()
        y_oh = tf.keras.utils.to_categorical(y_int, 4)
        idx = np.arange(n_samples)
        i_train, i_rem = train_test_split(
            idx, test_size=0.3, random_state=42, stratify=y_int
        )
        y_rem = y_int[i_rem]
        i_val, i_test = train_test_split(
            i_rem, test_size=0.5, random_state=42, stratify=y_rem
        )
        X_tr, y_tr = X[i_train], y_oh[i_train]
        X_val, y_val = X[i_val], y_oh[i_val]
        X_te, y_te = X[i_test], y_oh[i_test]
        # Pass raw NumPy to `fit` — the most reliable path on Keras 3 + macOS/TF 2.21
        # (we keep light augmentation in ClinicalMetrics* only; holdout still reflects real IHC)
        val_data = (X_val, y_val)
        callbacks: List[tf.keras.callbacks.Callback] = [
            ClinicalMetricsNumpyCallback(X_val, y_val, args.batch_size),
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=5, restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=2
            ),
            tf.keras.callbacks.ModelCheckpoint(
                filepath=str(args.output_dir / "best_intensity_model.keras"),
                monitor="val_loss",
                save_best_only=True,
            ),
        ]
        e1 = max(1, int(args.epochs * 0.7))
        e2 = max(1, args.epochs - max(1, int(args.epochs * 0.7)))
        history = model.fit(
            X_tr,
            y_tr,
            batch_size=args.batch_size,
            validation_data=val_data,
            epochs=e1,
            callbacks=callbacks,
            verbose=1,
            shuffle=True,
        )
        fine_tune_model(model, unfreeze_layers=30)
        history_ft = model.fit(
            X_tr,
            y_tr,
            batch_size=args.batch_size,
            validation_data=val_data,
            epochs=e2,
            callbacks=callbacks,
            verbose=1,
            shuffle=True,
        )
    else:
        model = build_model()
        x_train, x_tmp, y_train, y_tmp = train_test_split(
            image_paths, labels, test_size=0.3, random_state=42, stratify=labels
        )
        x_val, x_test, y_val, y_test = train_test_split(
            x_tmp, y_tmp, test_size=0.5, random_state=42, stratify=y_tmp
        )

        train_gen = DataGenerator(
            x_train, y_train, batch_size=args.batch_size, augment=True
        )
        val_gen = DataGenerator(
            x_val, y_val, batch_size=args.batch_size, augment=False, shuffle=False
        )
        test_gen = DataGenerator(
            x_test, y_test, batch_size=args.batch_size, augment=False, shuffle=False
        )
        callbacks = [
            ClinicalMetricsCallback(val_gen),
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=5, restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=2
            ),
            tf.keras.callbacks.ModelCheckpoint(
                filepath=str(args.output_dir / "best_intensity_model.keras"),
                monitor="val_loss",
                save_best_only=True,
            ),
        ]
        e1 = max(1, int(args.epochs * 0.7))
        e2 = max(1, args.epochs - max(1, int(args.epochs * 0.7)))
        history = model.fit(
            train_gen,
            validation_data=val_gen,
            epochs=e1,
            callbacks=callbacks,
            verbose=1,
        )
        fine_tune_model(model, unfreeze_layers=30)
        history_ft = model.fit(
            train_gen,
            validation_data=val_gen,
            epochs=e2,
            callbacks=callbacks,
            verbose=1,
        )

    for key, value in history_ft.history.items():
        history.history.setdefault(key, []).extend(value)

    plot_training_curves(history, args.output_dir)
    if use_numpy_fit:
        evaluate_and_export_arrays(
            model,
            X_te,
            y_te,
            args.batch_size,
            args.output_dir,
            clinical_metrics_path=args.clinical_metrics_path,
            metrics_header_note=metrics_header_note,
        )
    else:
        evaluate_and_export(
            model,
            test_gen,
            args.output_dir,
            clinical_metrics_path=args.clinical_metrics_path,
            metrics_header_note=metrics_header_note,
        )


if __name__ == "__main__":
    main()
