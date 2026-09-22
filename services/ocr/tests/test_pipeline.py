"""Unit tests for the preprocessing pipeline steps."""
import numpy as np
import pytest

from app.pipeline.loader import load_image
from app.pipeline.enhance import (
    to_grayscale,
    apply_clahe,
    denoise,
    sharpen,
    adaptive_threshold,
)
from app.pipeline.pipeline import run_pipeline
from app.pipeline.config import NATIONAL_ID_CONFIG, PASSPORT_CONFIG, DRIVER_LICENSE_CONFIG

from tests.conftest import _make_jpeg_bytes


@pytest.fixture
def bgr_image() -> np.ndarray:
    return load_image(_make_jpeg_bytes(400, 250))


def test_load_image_shape(bgr_image: np.ndarray) -> None:
    assert bgr_image.ndim == 3
    assert bgr_image.shape[2] == 3  # BGR channels


def test_to_grayscale(bgr_image: np.ndarray) -> None:
    gray = to_grayscale(bgr_image)
    assert gray.ndim == 2


def test_to_grayscale_idempotent(bgr_image: np.ndarray) -> None:
    gray = to_grayscale(bgr_image)
    gray2 = to_grayscale(gray)
    assert gray.shape == gray2.shape


def test_apply_clahe(bgr_image: np.ndarray) -> None:
    gray = to_grayscale(bgr_image)
    enhanced = apply_clahe(gray)
    assert enhanced.shape == gray.shape
    assert enhanced.dtype == np.uint8


def test_denoise(bgr_image: np.ndarray) -> None:
    gray = to_grayscale(bgr_image)
    denoised = denoise(gray, h=5)
    assert denoised.shape == gray.shape


def test_denoise_skips_when_h_zero(bgr_image: np.ndarray) -> None:
    gray = to_grayscale(bgr_image)
    out = denoise(gray, h=0)
    np.testing.assert_array_equal(out, gray)


def test_sharpen(bgr_image: np.ndarray) -> None:
    gray = to_grayscale(bgr_image)
    sharpened = sharpen(gray)
    assert sharpened.shape == gray.shape


def test_adaptive_threshold(bgr_image: np.ndarray) -> None:
    gray = to_grayscale(bgr_image)
    binary = adaptive_threshold(gray)
    assert binary.shape == gray.shape
    unique = set(np.unique(binary).tolist())
    # Adaptive threshold produces a binary image (0 and 255 only).
    assert unique.issubset({0, 255})


@pytest.mark.parametrize("config", [
    NATIONAL_ID_CONFIG,
    PASSPORT_CONFIG,
    DRIVER_LICENSE_CONFIG,
])
def test_run_pipeline_produces_ndarray(bgr_image: np.ndarray, config) -> None:
    result, warnings = run_pipeline(bgr_image.copy(), config)
    assert isinstance(result, np.ndarray)
    assert isinstance(warnings, list)
    assert result.ndim == 2  # grayscale output
