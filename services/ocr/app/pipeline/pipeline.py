"""
Orchestrates the ordered preprocessing steps for a document image.
Returns the enhanced grayscale image plus any warnings collected.
"""
from __future__ import annotations

import numpy as np

from .config import PipelineConfig
from .boundary import detect_and_warp
from .enhance import (
    to_grayscale,
    deskew,
    apply_clahe,
    denoise,
    sharpen,
    adaptive_threshold,
)


def run_pipeline(image: np.ndarray, config: PipelineConfig) -> tuple[np.ndarray, list[str]]:
    """
    Apply preprocessing steps in order.
    Returns (processed_image, warnings).
    All steps are defensive — a failure in one step falls back to the input image.
    """
    warnings: list[str] = []

    # 1. Document boundary detection + perspective warp
    if config.do_boundary_detect:
        image, warp_warnings = detect_and_warp(image)
        warnings.extend(warp_warnings)

    # 2. Grayscale
    gray = to_grayscale(image)

    # 3. Deskew (auto-rotation correction)
    if config.do_deskew:
        try:
            gray = deskew(gray)
        except Exception:
            pass

    # 4. CLAHE contrast enhancement
    if config.do_clahe:
        gray = apply_clahe(gray)

    # 5. Denoise
    if config.denoise_h > 0:
        gray = denoise(gray, h=config.denoise_h)

    # 6. Sharpen
    if config.do_sharpen:
        gray = sharpen(gray)

    # 7. Adaptive threshold → binary image
    if config.do_threshold:
        gray = adaptive_threshold(gray)

    return gray, warnings
