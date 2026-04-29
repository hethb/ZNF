from __future__ import annotations

import base64
import io
from typing import Optional

import numpy as np
import tensorflow as tf
from PIL import Image


def _tensor_rank(t: tf.Tensor) -> int:
    sh = t.shape
    rank = getattr(sh, "rank", None)
    if rank is not None:
        return int(rank)
    if hasattr(sh, "as_list"):
        return len(sh.as_list())
    return len(tuple(sh))


def _build_grad_cam_submodel(model: tf.keras.Model) -> tf.keras.Model:
    """Rebuild forward pass from ``model.input`` so rank-4 maps connect for Keras 3.

    Nested ``Functional`` backbones (e.g. MobileNetV2) use a different internal ``Input`` tensor
    than the parent model; ``Model(parent.input, backbone.output, …)`` then fails. Calling each
    layer in order on ``model.input`` wires a valid subgraph for Grad-CAM.
    """
    if len(model.layers) < 2:
        raise ValueError("Model too shallow for Grad-CAM.")
    x = model.input
    last_4d: tf.Tensor | None = None
    for layer in model.layers[1:]:
        x = layer(x)
        if _tensor_rank(x) == 4:
            last_4d = x
    if last_4d is None:
        raise ValueError("No rank-4 feature map found for Grad-CAM.")
    return tf.keras.models.Model(model.input, [last_4d, x])


def generate_gradcam_overlay_base64(
    model: tf.keras.Model,
    preprocessed_image: np.ndarray,
    original_image: Image.Image,
    class_idx: Optional[int] = None,
    alpha: float = 0.4,
) -> str:
    grad_model = _build_grad_cam_submodel(model)

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(preprocessed_image, training=False)
        tape.watch(conv_outputs)
        if class_idx is None:
            class_idx = int(tf.argmax(predictions[0]))
        class_channel = predictions[:, class_idx]

    grads = tape.gradient(class_channel, conv_outputs)
    if grads is None:
        raise RuntimeError("Grad-CAM gradients were None.")
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]

    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap + 1e-8)
    heatmap_np = heatmap.numpy()

    heatmap_img = Image.fromarray(np.uint8(255 * heatmap_np)).resize(original_image.size)
    heatmap_arr = np.asarray(heatmap_img, dtype=np.float32) / 255.0

    overlay = np.asarray(original_image.convert("RGB"), dtype=np.float32)
    red = np.zeros_like(overlay)
    red[..., 0] = 255.0 * heatmap_arr
    blended = np.clip((1.0 - alpha) * overlay + alpha * red, 0, 255).astype(np.uint8)

    out = io.BytesIO()
    Image.fromarray(blended).save(out, format="PNG")
    return base64.b64encode(out.getvalue()).decode("utf-8")
