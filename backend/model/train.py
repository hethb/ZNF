from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import tensorflow as tf
from sklearn.metrics import (
    classification_report,
    cohen_kappa_score,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split

from backend.model.ihc_analyzer import DataGenerator

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
        for x_batch, y_batch in self.val_data:
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


def evaluate_and_export(model: tf.keras.Model, test_gen: DataGenerator, output_dir: Path) -> None:
    y_true: List[int] = []
    y_pred: List[int] = []
    for x_batch, y_batch in test_gen:
        pred = model.predict(x_batch, verbose=0)
        y_true.extend(np.argmax(y_batch, axis=1))
        y_pred.extend(np.argmax(pred, axis=1))

    y_true_np = np.array(y_true)
    y_pred_np = np.array(y_pred)

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
    print("\nHeld-out test classification report:\n")
    print(report)
    print(macro_block)
    (output_dir / "classification_report.txt").write_text(report + macro_block)


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
    args = parser.parse_args()

    image_paths, labels = collect_dataset(args.data_dir)
    if not image_paths:
        raise ValueError("No training images found. Check data directory structure.")

    x_train, x_tmp, y_train, y_tmp = train_test_split(
        image_paths, labels, test_size=0.3, random_state=42, stratify=labels
    )
    x_val, x_test, y_val, y_test = train_test_split(
        x_tmp, y_tmp, test_size=0.5, random_state=42, stratify=y_tmp
    )

    train_gen = DataGenerator(x_train, y_train, batch_size=args.batch_size, augment=True)
    val_gen = DataGenerator(x_val, y_val, batch_size=args.batch_size, augment=False, shuffle=False)
    test_gen = DataGenerator(x_test, y_test, batch_size=args.batch_size, augment=False, shuffle=False)

    model = build_model()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    callbacks: List[tf.keras.callbacks.Callback] = [
        ClinicalMetricsCallback(val_gen),
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(args.output_dir / "best_intensity_model.keras"),
            monitor="val_loss",
            save_best_only=True,
        ),
    ]

    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=max(1, int(args.epochs * 0.7)),
        callbacks=callbacks,
        verbose=1,
    )

    fine_tune_model(model, unfreeze_layers=30)
    history_ft = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=max(1, args.epochs - max(1, int(args.epochs * 0.7))),
        callbacks=callbacks,
        verbose=1,
    )

    for key, value in history_ft.history.items():
        history.history.setdefault(key, []).extend(value)

    plot_training_curves(history, args.output_dir)
    evaluate_and_export(model, test_gen, args.output_dir)


if __name__ == "__main__":
    main()
