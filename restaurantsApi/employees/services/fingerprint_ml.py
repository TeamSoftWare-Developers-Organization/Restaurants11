from __future__ import annotations
import os
import io

try:
    import numpy as np
except ImportError:
    np = None

try:
    from PIL import Image
except ImportError:
    Image = None

from django.conf import settings

# Global in-memory model cache
_EMBEDDING_MODEL = None

def get_model_path() -> str:
    """Returns absolute path to the stored model file"""
    base_dir = None
    try:
        if settings.configured:
            base_dir = getattr(settings, 'BASE_DIR', None)
    except Exception:
        pass
    if not base_dir:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)
    return os.path.join(models_dir, 'fingerprint_encoder.keras')

def build_or_load_model():
    """
    Loads existing trained CNN feature extractor or builds and saves a lightweight
    TensorFlow Keras model designed specifically for fingerprint embedding extraction.
    """
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is not None:
        return _EMBEDDING_MODEL

    import tensorflow as tf
    model_path = get_model_path()

    if os.path.exists(model_path):
        try:
            _EMBEDDING_MODEL = tf.keras.models.load_model(model_path)
            return _EMBEDDING_MODEL
        except Exception as e:
            print(f"Warning: Failed to load existing model from {model_path} ({e}). Rebuilding...")

    # Build a lightweight, high-performance CNN feature extractor
    inputs = tf.keras.Input(shape=(128, 128, 1), name="fingerprint_input")
    x = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same')(inputs)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)

    x = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same')(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)

    x = tf.keras.layers.Conv2D(128, (3, 3), activation='relu', padding='same')(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)

    # 128-dimensional embedding vector
    outputs = tf.keras.layers.Dense(128, activation='linear', name="fingerprint_embedding")(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="FingerprintCNNEncoder")
    
    try:
        model.save(model_path)
    except Exception as err:
        print(f"Notice: Could not save model to {model_path}: {err}")

    _EMBEDDING_MODEL = model
    return _EMBEDDING_MODEL

from typing import Any

def preprocess_fingerprint(image_bytes: bytes) -> Any:
    """
    Converts raw fingerprint image bytes into Grayscale 128x128 normalized array
    ready for CNN tensor input: shape (1, 128, 128, 1).
    """
    image = Image.open(io.BytesIO(image_bytes)).convert('L')
    image = image.resize((128, 128))
    img_array = np.array(image, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=[0, -1])  # (1, 128, 128, 1)
    return img_array

def extract_fingerprint_embedding(image_bytes: bytes) -> list:
    """
    Extracts an L2-normalized 128-dimensional feature embedding vector using TensorFlow CNN.
    """
    model = build_or_load_model()
    processed = preprocess_fingerprint(image_bytes)
    raw_embedding = model(processed, training=False).numpy()[0]
    
    # L2 Normalization
    norm = np.linalg.norm(raw_embedding)
    if norm > 1e-10:
        normalized = raw_embedding / norm
    else:
        normalized = raw_embedding
        
    return normalized.tolist()

def calculate_cosine_similarity(vec_a: list, vec_b: list) -> float:
    """
    Computes Cosine Similarity between two embedding vectors:
    Similarity = (u . v) / (||u|| * ||v||)
    Returns float value typically between 0.0 and 1.0.
    """
    if not vec_a or not vec_b:
        return 0.0
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-10 or norm_b < 1e-10:
        return 0.0
    score = float(np.dot(a, b) / (norm_a * norm_b))
    return max(0.0, min(1.0, score))
