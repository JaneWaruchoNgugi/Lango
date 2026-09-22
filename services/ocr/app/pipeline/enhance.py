"""
Image enhancement steps for OCR preparation.
Each function takes and returns a numpy array.
Grayscale steps operate on single-channel; colour steps on BGR.
"""
from __future__ import annotations

import cv2
import numpy as np


def to_grayscale(image: np.ndarray) -> np.ndarray:
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def deskew(gray: np.ndarray, angle_threshold: float = 0.5) -> np.ndarray:
    """
    Correct small rotations using the angle of the largest text bounding box.
    Skips correction when detected angle is below threshold (avoids false corrections).
    """
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(binary > 0))
    if len(coords) < 5:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = 90 + angle
    if abs(angle) < angle_threshold:
        return gray
    h, w = gray.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def apply_clahe(gray: np.ndarray) -> np.ndarray:
    """CLAHE contrast enhancement — preserves local detail better than global EQ."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def denoise(gray: np.ndarray, h: int = 10) -> np.ndarray:
    """Fast non-local means denoising. h=0 skips (used to disable per config)."""
    if h <= 0:
        return gray
    return cv2.fastNlMeansDenoising(gray, h=h, templateWindowSize=7, searchWindowSize=21)


def sharpen(gray: np.ndarray) -> np.ndarray:
    """Unsharp mask sharpening to crisp thin text strokes."""
    blurred = cv2.GaussianBlur(gray, (0, 0), 3)
    return cv2.addWeighted(gray, 1.5, blurred, -0.5, 0)


def adaptive_threshold(gray: np.ndarray) -> np.ndarray:
    """
    Adaptive Gaussian threshold — handles uneven lighting across card surface.
    Produces a binary image that Tesseract processes best.
    """
    return cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=11,
        C=2,
    )
