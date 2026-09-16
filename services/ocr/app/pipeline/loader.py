"""
Load raw image bytes into a numpy array with EXIF orientation correction
and resolution normalisation.
"""
from __future__ import annotations

import io
import logging

import cv2
import numpy as np
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

MAX_EDGE = 2400   # pixels — upper bound; larger images slow Tesseract with no accuracy gain
MIN_EDGE = 1000   # pixels — lower bound; ensure sufficient DPI for small captures


def _exif_rotation(img: Image.Image) -> Image.Image:
    """Rotate image to compensate for EXIF orientation tag."""
    try:
        exif = img._getexif()  # type: ignore[attr-defined]
        if exif is None:
            return img
        orient_key = next(
            (k for k, v in ExifTags.TAGS.items() if v == "Orientation"), None
        )
        if orient_key is None or orient_key not in exif:
            return img
        orientation = exif[orient_key]
        rotations = {3: 180, 6: 270, 8: 90}
        if orientation in rotations:
            img = img.rotate(rotations[orientation], expand=True)
    except Exception as exc:
        logger.debug("EXIF orientation read failed: %s", exc)
    return img


def load_image(image_bytes: bytes) -> np.ndarray:
    """
    Load image bytes → OpenCV BGR ndarray.
    Applies EXIF orientation fix and resizes to working resolution.
    """
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    pil_img = _exif_rotation(pil_img)

    arr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    h, w = arr.shape[:2]
    longest = max(h, w)
    shortest = min(h, w)

    if longest > MAX_EDGE:
        scale = MAX_EDGE / longest
        arr = cv2.resize(arr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    elif shortest < MIN_EDGE:
        scale = MIN_EDGE / shortest
        arr = cv2.resize(arr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    return arr
