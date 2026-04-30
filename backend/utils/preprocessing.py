from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


@dataclass(frozen=True)
class PreprocessConfig:
    target_size: Tuple[int, int] = (224, 224)
    min_size: Tuple[int, int] = (64, 64)
    # Downscale before 224 model input and Grad-CAM. Huge clinical exports (multi‑MP) otherwise
    # make PIL resizes and heatmap→full-size blends take minutes and gigabytes of RAM.
    max_input_long_edge: int = 2048


def load_rgb_image(image_path: Path) -> Image.Image:
    with Image.open(image_path) as img:
        return img.convert("RGB")


def cap_pil_long_edge(image: Image.Image, max_edge: int) -> Image.Image:
    """If either dimension exceeds max_edge, scale down (aspect preserving). No-op if already smaller."""
    if max(image.size) <= max_edge:
        return image
    out = image.copy()
    out.thumbnail((max_edge, max_edge), Image.LANCZOS)
    return out


def preprocess_pil_image(image: Image.Image, config: PreprocessConfig = PreprocessConfig()) -> np.ndarray:
    if image.width < config.min_size[0] or image.height < config.min_size[1]:
        raise ValueError(f"Image too small: minimum is {config.min_size[0]}x{config.min_size[1]} pixels.")

    image = image.resize(config.target_size, Image.BILINEAR)
    array = np.asarray(image, dtype=np.float32) / 255.0
    array = (array - IMAGENET_MEAN) / IMAGENET_STD
    return np.expand_dims(array, axis=0)
