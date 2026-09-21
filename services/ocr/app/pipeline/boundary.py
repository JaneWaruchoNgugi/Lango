"""
Document boundary detection and perspective correction.

Attempts to locate the largest quadrilateral in the image (the document),
then applies a perspective warp to produce a flat, axis-aligned crop.
Falls back gracefully when no clean quad is found.
"""
from __future__ import annotations

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Document must cover at least this fraction of the image area to be accepted.
MIN_AREA_FRACTION = 0.15


def _order_points(pts: np.ndarray) -> np.ndarray:
    """Order four corner points: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _find_document_quad(gray: np.ndarray) -> Optional[np.ndarray]:
    """Return a (4, 2) array of corner points, or None if not found."""
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)

    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Sort by area descending — the document is typically the largest contour.
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    image_area = gray.shape[0] * gray.shape[1]

    for contour in contours[:5]:
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        area = cv2.contourArea(contour)
        if len(approx) == 4 and area > MIN_AREA_FRACTION * image_area:
            return approx.reshape(4, 2).astype("float32")

    return None


def detect_and_warp(image: np.ndarray) -> tuple[np.ndarray, list[str]]:
    """
    Detect document boundary and apply perspective warp.
    Returns (warped_image, warnings_list).
    If detection fails, returns the original image with a warning.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    quad = _find_document_quad(gray)

    if quad is None:
        logger.debug("Document boundary not found — using full image")
        return image, ["Document boundary could not be confidently detected."]

    rect = _order_points(quad)
    tl, tr, br, bl = rect

    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_w = int(max(width_a, width_b))

    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_h = int(max(height_a, height_b))

    if max_w < 100 or max_h < 100:
        return image, ["Document boundary too small to warp reliably."]

    dst = np.array(
        [[0, 0], [max_w - 1, 0], [max_w - 1, max_h - 1], [0, max_h - 1]],
        dtype="float32",
    )
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (max_w, max_h))
    return warped, []
