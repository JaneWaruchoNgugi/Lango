"""HTTP integration tests for POST /ocr/document, GET /health, GET /ready."""
import base64

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_TOKEN, _make_base64


def test_health(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_ready_returns_200(client: TestClient) -> None:
    """Ready may return ready:false if Tesseract not installed in CI, but must be HTTP 200."""
    r = client.get("/ready")
    assert r.status_code == 200
    data = r.json()
    assert "ready" in data


def test_ocr_document_success(client: TestClient, test_image_b64: str) -> None:
    r = client.post("/ocr/document", json={
        "image_base64": test_image_b64,
        "media_type": "image/jpeg",
        "doc_type": "auto",
    })
    assert r.status_code == 200
    data = r.json()
    assert "success" in data
    assert "doc_type" in data
    assert "fields" in data
    assert "overall_confidence" in data


def test_ocr_document_missing_image(client: TestClient) -> None:
    r = client.post("/ocr/document", json={
        "media_type": "image/jpeg",
        "doc_type": "auto",
    })
    assert r.status_code == 422  # Pydantic validation


def test_ocr_document_image_too_short(client: TestClient) -> None:
    r = client.post("/ocr/document", json={
        "image_base64": base64.b64encode(b"tiny").decode(),
        "media_type": "image/jpeg",
        "doc_type": "auto",
    })
    assert r.status_code == 422  # min_length=100 in schema


def test_ocr_document_invalid_media_type(client: TestClient, test_image_b64: str) -> None:
    r = client.post("/ocr/document", json={
        "image_base64": test_image_b64,
        "media_type": "image/gif",
        "doc_type": "auto",
    })
    assert r.status_code == 422  # Literal constraint


def test_ocr_document_oversized(client: TestClient) -> None:
    """A payload that estimates over 5 MB should be rejected with 422."""
    # Each base64 char ≈ 0.75 bytes; need > 5 MB raw = ~6.7 M base64 chars.
    big_b64 = "A" * 7_000_000
    r = client.post("/ocr/document", json={
        "image_base64": big_b64,
        "media_type": "image/jpeg",
        "doc_type": "auto",
    })
    assert r.status_code == 422


def test_ocr_document_invalid_base64(client: TestClient) -> None:
    r = client.post("/ocr/document", json={
        "image_base64": "!!!not-base64!!!" + "X" * 100,  # length >= 100, invalid chars
        "media_type": "image/jpeg",
        "doc_type": "auto",
    })
    assert r.status_code == 422


def test_auth_missing_token(auth_client: TestClient, test_image_b64: str) -> None:
    r = auth_client.post("/ocr/document", json={
        "image_base64": test_image_b64,
        "media_type": "image/jpeg",
        "doc_type": "auto",
    })
    assert r.status_code == 401


def test_auth_wrong_token(auth_client: TestClient, test_image_b64: str) -> None:
    r = auth_client.post(
        "/ocr/document",
        json={"image_base64": test_image_b64, "media_type": "image/jpeg", "doc_type": "auto"},
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert r.status_code == 401


def test_auth_correct_token(auth_client: TestClient, test_image_b64: str) -> None:
    r = auth_client.post(
        "/ocr/document",
        json={"image_base64": test_image_b64, "media_type": "image/jpeg", "doc_type": "auto"},
        headers={"Authorization": f"Bearer {TEST_TOKEN}"},
    )
    assert r.status_code == 200
