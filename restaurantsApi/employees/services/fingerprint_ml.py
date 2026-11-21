from __future__ import annotations
import os
import io
import sys
from pathlib import Path
from typing import Any

try:
    import numpy as np
except ImportError:
    np = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import cv2
except ImportError:
    cv2 = None

from django.conf import settings

_WEIGHTS_CACHE = None


def _resolve_weights_path() -> str:
    """البحث عن ملف أوزان البصمة في مجلد التطبيق أو _MEIPASS لوضع --onefile."""
    candidates = []
    if getattr(sys, "frozen", False):
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            candidates.append(Path(meipass) / "models" / "fingerprint_weights.npz")
            candidates.append(Path(meipass) / "restaurantsApi" / "models" / "fingerprint_weights.npz")
        exe_dir = Path(sys.executable).parent
        candidates.append(exe_dir / "models" / "fingerprint_weights.npz")

    try:
        if settings.configured and getattr(settings, "BASE_DIR", None):
            candidates.append(Path(settings.BASE_DIR) / "models" / "fingerprint_weights.npz")
    except Exception:
        pass

    app_root = Path(__file__).resolve().parent.parent.parent
    candidates.append(app_root / "models" / "fingerprint_weights.npz")

    for p in candidates:
        if p.exists():
            return str(p)
    return str(candidates[-1])


def _load_weights():
    global _WEIGHTS_CACHE
    if _WEIGHTS_CACHE is not None:
        return _WEIGHTS_CACHE

    weights_path = _resolve_weights_path()
    if np is not None and os.path.exists(weights_path):
        data = np.load(weights_path)
        _WEIGHTS_CACHE = {k: data[k].astype(np.float32) for k in data.files}
        return _WEIGHTS_CACHE
    return None


def _conv2d_same_relu(x: "np.ndarray", kernel: "np.ndarray", bias: "np.ndarray") -> "np.ndarray":
    """تنفيذ طبقة Conv2D 3x3 (padding='same', activation='relu') بـ NumPy المتجهي."""
    h, w, c_in = x.shape
    c_out = kernel.shape[-1]
    x_pad = np.pad(x, ((1, 1), (1, 1), (0, 0)), mode="constant")
    windows = np.lib.stride_tricks.sliding_window_view(x_pad, (3, 3), axis=(0, 1))
    patches = np.transpose(windows, (0, 1, 3, 4, 2)).reshape(h * w, 9 * c_in)
    w_flat = kernel.reshape(9 * c_in, c_out)
    out = (patches @ w_flat + bias).reshape(h, w, c_out)
    return np.maximum(out, 0.0)


def _batch_norm(
    x: "np.ndarray",
    gamma: "np.ndarray",
    beta: "np.ndarray",
    mean: "np.ndarray",
    var: "np.ndarray",
    epsilon: float = 1e-3,
) -> "np.ndarray":
    return gamma * (x - mean) / np.sqrt(var + epsilon) + beta


def _max_pool_2x2(x: "np.ndarray") -> "np.ndarray":
    h, w, c = x.shape
    return x.reshape(h // 2, 2, w // 2, 2, c).max(axis=(1, 3))


def _fallback_gradient_descriptor(img_gray: "np.ndarray") -> "np.ndarray":
    """خطة احتياطية حتمية عبر تدرجات الحواف والمناطق المكانية (128 بُعداً) إذا غاب ملف الأوزان."""
    gx = np.diff(img_gray, axis=1, prepend=img_gray[:, :1])
    gy = np.diff(img_gray, axis=0, prepend=img_gray[:1, :])
    mag = np.hypot(gx, gy)
    ang = np.arctan2(gy, gx)

    bins = np.clip(((ang + np.pi) / (2 * np.pi) * 8).astype(np.int32), 0, 7)
    features = []
    cell = 32
    for r in range(4):
        for c in range(4):
            cell_mag = mag[r * cell : (r + 1) * cell, c * cell : (c + 1) * cell]
            cell_bin = bins[r * cell : (r + 1) * cell, c * cell : (c + 1) * cell]
            hist = np.bincount(cell_bin.ravel(), weights=cell_mag.ravel(), minlength=8)
            features.append(hist)
    return np.concatenate(features).astype(np.float32)


def preprocess_fingerprint(image_bytes: bytes) -> Any:
    """تحويل بايتات صورة البصمة إلى مصفوفة رمادية معيارية (128, 128, 1)."""
    if cv2 is not None and np is not None:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            if img is not None:
                img_resized = cv2.resize(img, (128, 128), interpolation=cv2.INTER_AREA)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                img_enhanced = clahe.apply(img_resized)
                img_normalized = img_enhanced.astype(np.float32) / 255.0
                return np.expand_dims(img_normalized, axis=-1)
        except Exception:
            pass

    if Image is None or np is None:
        raise RuntimeError("مكتبات معالجة الصور (Pillow / NumPy) غير متوفرة")

    image = Image.open(io.BytesIO(image_bytes)).convert("L")
    image = image.resize((128, 128))
    img_array = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(img_array, axis=-1)


def extract_fingerprint_embedding(image_bytes: bytes) -> list:
    """استخراج متجه 128 بُعداً مطابقاً للشبكة العصبية عبر NumPy النقي بدون TensorFlow."""
    img = preprocess_fingerprint(image_bytes)
    weights = _load_weights()

    if weights is not None:
        x = _conv2d_same_relu(img, weights["c1_w"], weights["c1_b"])
        x = _batch_norm(x, weights["bn1_g"], weights["bn1_b"], weights["bn1_m"], weights["bn1_v"])
        x = _max_pool_2x2(x)

        x = _conv2d_same_relu(x, weights["c2_w"], weights["c2_b"])
        x = _batch_norm(x, weights["bn2_g"], weights["bn2_b"], weights["bn2_m"], weights["bn2_v"])
        x = _max_pool_2x2(x)

        x = _conv2d_same_relu(x, weights["c3_w"], weights["c3_b"])
        x = _batch_norm(x, weights["bn3_g"], weights["bn3_b"], weights["bn3_m"], weights["bn3_v"])

        pooled = x.mean(axis=(0, 1))
        raw_embedding = pooled @ weights["dense_w"] + weights["dense_b"]
    else:
        raw_embedding = _fallback_gradient_descriptor(img[:, :, 0])

    norm = float(np.linalg.norm(raw_embedding))
    if norm > 1e-10:
        normalized = raw_embedding / norm
    else:
        normalized = raw_embedding

    return normalized.tolist()


def calculate_cosine_similarity(vec_a: list, vec_b: list) -> float:
    """حساب التشابه الجيبي Cosine Similarity بين متجهي بصمة."""
    if not vec_a or not vec_b or np is None:
        return 0.0
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = float(np.linalg.norm(a))
    norm_b = float(np.linalg.norm(b))
    if norm_a < 1e-10 or norm_b < 1e-10:
        return 0.0
    score = float(np.dot(a, b) / (norm_a * norm_b))
    return max(0.0, min(1.0, score))
