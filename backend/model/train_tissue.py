from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List, Tuple

import tensorflow as tf
from sklearn.model_selection import train_test_split

from backend.model.ihc_analyzer import DataGenerator, TISSUE_CLASSES


LABEL_MAP: Dict[str, int] = {name: idx for idx, name in enumerate(TISSUE_CLASSES)}


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


def build_model(num_classes: int) -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3), include_top=False, weights="imagenet"
    )
    base.trainable = False

    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = base(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.35)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", type=Path, default=Path("data/tissue"))
    parser.add_argument("--output_dir", type=Path, default=Path("backend/model/artifacts"))
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch_size", type=int, default=16)
    args = parser.parse_args()

    image_paths, labels = collect_dataset(args.data_dir)
    if not image_paths:
        raise ValueError("No tissue training images found. Check data/tissue directory structure.")

    x_train, x_val, y_train, y_val = train_test_split(
        image_paths, labels, test_size=0.2, random_state=42, stratify=labels
    )

    train_gen = DataGenerator(
        x_train,
        y_train,
        batch_size=args.batch_size,
        num_classes=len(TISSUE_CLASSES),
        augment=True,
    )
    val_gen = DataGenerator(
        x_val,
        y_val,
        batch_size=args.batch_size,
        num_classes=len(TISSUE_CLASSES),
        augment=False,
        shuffle=False,
    )

    model = build_model(num_classes=len(TISSUE_CLASSES))
    args.output_dir.mkdir(parents=True, exist_ok=True)

    callbacks: List[tf.keras.callbacks.Callback] = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(args.output_dir / "best_tissue_model.keras"),
            monitor="val_loss",
            save_best_only=True,
        ),
    ]

    model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=args.epochs,
        callbacks=callbacks,
        verbose=1,
    )


if __name__ == "__main__":
    main()
