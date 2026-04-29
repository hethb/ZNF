from __future__ import annotations

import base64
import io
from typing import Optional

import numpy as np
import tensorflow as tf
from PIL import Image


def _get_last_conv_layer_name(model: tf.keras.Model) -> str:
    for layer in reversed(model.layers):
        if len(layer.output.shape) == 4:
            return layer.name
    raise ValueError("No 4D convolutional layer found for Grad-CAM.")


def generate_gradcam_overlay_base64(
    model: tf.keras.Model,
    preprocessed_image: np.ndarray,
    original_image: Image.Image,
    class_idx: Optional[int] = None,
    alpha: float = 0.4,
) -> str:
    last_conv_layer = _get_last_conv_layer_name(model)
    grad_model = tf.keras.models.Model(
        [model.inputs], [model.get_layer(last_conv_layer).output, model.output]
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(preprocessed_image, training=False)
        if class_idx is None:
            class_idx = int(tf.argmax(predictions[0]))
        class_channel = predictions[:, class_idx]

    grads = tape.gradient(class_channel, conv_outputs)
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
