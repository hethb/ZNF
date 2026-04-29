from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras import layers

from backend.utils.preprocessing import preprocess_pil_image

INTENSITY_LABELS: Dict[int, str] = {
    0: "0 (Negative)",
    1: "1+ (Weak)",
    2: "2+ (Moderate)",
    3: "3+ (Strong)",
}

TISSUE_CLASSES: List[str] = [
    "tumor",
    "stroma",
    "adipose",
    "lympho",
    "mucosa",
    "debris",
    "empty",
    "complex",
]


@dataclass
class PredictionResult:
    tissue_type: str
    tissue_confidence: float
    intensity_score: Optional[int]
    intensity_label: Optional[str]
    confidence: float
    uncertainty_std: float
    needs_review: bool


class DataGenerator(tf.keras.utils.Sequence):
    def __init__(
        self,
        image_paths: Sequence[Path],
        labels: Sequence[int],
        batch_size: int = 16,
        num_classes: int = 4,
        shuffle: bool = True,
        augment: bool = False,
    ) -> None:
        self.image_paths = list(image_paths)
        self.labels = np.array(labels, dtype=np.int32)
        self.batch_size = batch_size
        self.num_classes = num_classes
        self.shuffle = shuffle
        self.augment = augment
        self.indexes = np.arange(len(self.image_paths))
        self.augmenter = tf.keras.preprocessing.image.ImageDataGenerator(
            horizontal_flip=True,
            vertical_flip=True,
            rotation_range=15,
            brightness_range=(0.8, 1.2),
            zoom_range=(0.0, 0.15),
            fill_mode="nearest",
        )
        self.on_epoch_end()

    def __len__(self) -> int:
        return int(np.ceil(len(self.image_paths) / self.batch_size))

    def __getitem__(self, idx: int) -> Tuple[np.ndarray, np.ndarray]:
        batch_idx = self.indexes[idx * self.batch_size : (idx + 1) * self.batch_size]
        x_batch: List[np.ndarray] = []
        y_batch: List[int] = []

        for i in batch_idx:
            with Image.open(self.image_paths[i]) as pil_img:
                img = pil_img.convert("RGB")
            arr = preprocess_pil_image(img)[0]
            if self.augment:
                arr = self.augmenter.random_transform(arr)
            x_batch.append(arr)
            y_batch.append(int(self.labels[i]))

        x = np.array(x_batch, dtype=np.float32)
        y = tf.keras.utils.to_categorical(y_batch, num_classes=self.num_classes)
        return x, y

    def on_epoch_end(self) -> None:
        if self.shuffle:
            np.random.shuffle(self.indexes)


class IHCAnalyzer:
    def __init__(
        self,
        intensity_model_path: Optional[Path] = None,
        tissue_model_path: Optional[Path] = None,
        version: str = "0.1.0",
    ) -> None:
        self.version = version
        self.intensity_model = self._load_model_if_exists(intensity_model_path)
        self.tissue_model = self._load_model_if_exists(tissue_model_path)
        self.tumor_gate_threshold = 0.45
        self.tumor_margin_override = 0.12

    @staticmethod
    def _build_mobilenet_head(num_classes: int, dropout_rate: float = 0.35) -> tf.keras.Model:
        base = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3), include_top=False, weights="imagenet"
        )
        base.trainable = False

        inputs = layers.Input(shape=(224, 224, 3))
        x = base(inputs, training=False)
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dropout(dropout_rate)(x)
        outputs = layers.Dense(num_classes, activation="softmax")(x)
        model = tf.keras.Model(inputs, outputs)
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )
        return model

    def _load_model_if_exists(self, model_path: Optional[Path]) -> Optional[tf.keras.Model]:
        if model_path and model_path.exists():
            return tf.keras.models.load_model(model_path)
        return None

    @property
    def intensity_model_loaded(self) -> bool:
        return self.intensity_model is not None

    @property
    def tissue_model_loaded(self) -> bool:
        return self.tissue_model is not None

    @property
    def ready(self) -> bool:
        return self.intensity_model_loaded and self.tissue_model_loaded

    def classify_tissue(self, image: Image.Image) -> Tuple[str, float]:
        if self.tissue_model is None:
            raise RuntimeError("Tissue model is not loaded.")
        x = preprocess_pil_image(image)
        pred = self.tissue_model.predict(x, verbose=0)[0]
        idx = int(np.argmax(pred))
        return TISSUE_CLASSES[idx], float(pred[idx])

    def predict_intensity_with_uncertainty(self, image: Image.Image, runs: int = 10) -> Tuple[int, float, float]:
        if self.intensity_model is None:
            raise RuntimeError("Intensity model is not loaded.")
        x = preprocess_pil_image(image)
        preds: List[np.ndarray] = []
        for _ in range(runs):
            p = self.intensity_model(x, training=True).numpy()[0]
            preds.append(p)

        pred_stack = np.stack(preds, axis=0)
        mean_pred = np.mean(pred_stack, axis=0)
        std_pred = np.std(pred_stack, axis=0)

        idx = int(np.argmax(mean_pred))
        confidence = float(mean_pred[idx])
        uncertainty = float(std_pred[idx])
        return idx, confidence, uncertainty

    def _should_run_intensity(
        self,
        top_tissue_idx: int,
        top_tissue_conf: float,
        tumor_conf: float,
    ) -> bool:
        # Run intensity if tumor wins, tumor probability is strong enough, or
        # tumor is close to the top class (uncertain tissue classifier case).
        if top_tissue_idx == 0:
            return True
        if tumor_conf >= self.tumor_gate_threshold:
            return True
        return (top_tissue_conf - tumor_conf) <= self.tumor_margin_override

    def analyze(self, image: Image.Image) -> PredictionResult:
        if self.tissue_model is None:
            raise RuntimeError("Tissue model is not loaded.")

        x = preprocess_pil_image(image)
        tissue_probs = self.tissue_model.predict(x, verbose=0)[0]
        top_idx = int(np.argmax(tissue_probs))
        top_conf = float(tissue_probs[top_idx])
        tissue_type = TISSUE_CLASSES[top_idx]
        tumor_conf = float(tissue_probs[0])

        if not self._should_run_intensity(top_idx, top_conf, tumor_conf):
            return PredictionResult(
                tissue_type=tissue_type,
                tissue_confidence=top_conf,
                intensity_score=None,
                intensity_label=None,
                confidence=tumor_conf,
                uncertainty_std=0.0,
                needs_review=True,
            )

        score, confidence, std = self.predict_intensity_with_uncertainty(image, runs=10)
        # Mark review when tissue classifier did not confidently call tumor.
        tissue_gate_uncertain = top_idx != 0
        return PredictionResult(
            tissue_type=tissue_type,
            tissue_confidence=top_conf,
            intensity_score=score,
            intensity_label=INTENSITY_LABELS[score],
            confidence=confidence,
            uncertainty_std=std,
            needs_review=(std > 0.15) or tissue_gate_uncertain,
        )
