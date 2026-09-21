"""
FastAPI router: POST /ocr/document, GET /health, GET /ready.
"""
from __future__ import annotations

import base64
import logging
import uuid

import pytesseract
from fastapi import APIRouter, Depends, HTTPException, Request, status

from .config import settings
from .dependencies import verify_token, get_provider
from .providers.base import OcrProvider
from .schemas import OcrRequest, OcrResponse, OcrError, HealthResponse, ReadyResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["ops"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok", demo_mode=settings.ocr_demo_mode)


@router.get("/ready", response_model=ReadyResponse, tags=["ops"])
async def ready() -> ReadyResponse:
    """Confirms Tesseract is installed and responding."""
    try:
        version = pytesseract.get_tesseract_version()
        return ReadyResponse(ready=True, tesseract_version=str(version))
    except Exception as exc:
        return ReadyResponse(ready=False, error=str(exc))


@router.post("/ocr/document", response_model=OcrResponse, tags=["ocr"])
async def analyze_document(
    request: Request,
    body: OcrRequest,
    _: None = Depends(verify_token),
    provider: OcrProvider = Depends(get_provider),
) -> OcrResponse:
    """
    Accepts a base64-encoded document image and returns structured OCR results
    with per-field confidence scores.
    """
    request_id = str(uuid.uuid4())[:8]

    # Validate base64 payload size BEFORE decoding.
    # base64 overhead is ~4/3; raw bytes = len * 0.75.
    estimated_bytes = len(body.image_base64) * 3 // 4
    if estimated_bytes > settings.max_file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Image exceeds maximum size of {settings.max_file_bytes // (1024*1024)} MB.",
        )

    try:
        image_bytes = base64.b64decode(body.image_base64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid base64 image data.",
        )

    logger.info(
        "OCR request %s: doc_type=%s size=%d bytes",
        request_id, body.doc_type, len(image_bytes),
    )

    try:
        result = await provider.process(image_bytes, body.doc_type)
    except TimeoutError:
        logger.error("OCR request %s timed out", request_id)
        return OcrResponse(
            success=False,
            error=OcrError(
                code="SERVICE_ERROR",
                message="OCR processing timed out. Please try again.",
                recoverable=True,
            ),
        )
    except Exception as exc:
        logger.error("OCR request %s failed: %s", request_id, exc)
        return OcrResponse(
            success=False,
            error=OcrError(
                code="SERVICE_ERROR",
                message="OCR processing encountered an unexpected error.",
                recoverable=True,
            ),
        )

    logger.info(
        "OCR request %s complete: doc_type=%s success=%s confidence=%.2f duration=%dms",
        request_id, result.doc_type, result.success,
        result.overall_confidence, result.processing_ms,
    )

    return result
