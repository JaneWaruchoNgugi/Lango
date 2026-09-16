"""
Pytest fixtures for the OCR service tests.

All tests use MockProvider injected via FastAPI's dependency_overrides — no
Tesseract installation required to run the test suite.
"""
import base64
import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.dependencies import get_provider, verify_token
from app.providers.mock import MockProvider

TEST_TOKEN = "test-token"


def _make_jpeg_bytes(width: int = 400, height: int = 250) -> bytes:
    """Create a small white JPEG as a synthetic document image."""
    arr = np.ones((height, width, 3), dtype=np.uint8) * 255
    img = Image.fromarray(arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_base64(width: int = 400, height: int = 250) -> str:
    return base64.b64encode(_make_jpeg_bytes(width, height)).decode()


@pytest.fixture
def test_image_b64() -> str:
    return _make_base64()


@pytest.fixture
def test_image_bytes() -> bytes:
    return _make_jpeg_bytes()


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client with MockProvider and a known token."""
    import os
    os.environ["OCR_SERVICE_TOKEN"] = TEST_TOKEN
    os.environ["OCR_DEMO_MODE"] = "false"

    app = create_app()
    mock = MockProvider()

    app.dependency_overrides[get_provider] = lambda: mock
    app.dependency_overrides[verify_token] = lambda: None  # bypass token for most tests

    return TestClient(app)


@pytest.fixture
def auth_client() -> TestClient:
    """Test client that enforces real token checking."""
    import os
    os.environ["OCR_SERVICE_TOKEN"] = TEST_TOKEN

    app = create_app()
    mock = MockProvider()
    app.dependency_overrides[get_provider] = lambda: mock

    return TestClient(app)
