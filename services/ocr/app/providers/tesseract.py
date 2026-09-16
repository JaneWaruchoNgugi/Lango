"""
TesseractProvider — the real OCR orchestration.

Coordinates: load → pipeline → parser → response assembly.
Everything stays in-memory (np.ndarray, bytes); no temp files written by this code.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import time
from functools import partial

import numpy as np

from ..config import settings
from ..pipeline.config import NATIONAL_ID_CONFIG, PASSPORT_CONFIG, DRIVER_LICENSE_CONFIG
from ..pipeline.loader import load_image
from ..pipeline.pipeline import run_pipeline
from ..parsers.base import ParsedDocument
from ..parsers.national_id import KenyanNationalIdParser
from ..parsers.passport import PassportParser
from ..parsers.driver_license import DriverLicenseParser
from ..schemas import OcrResponse, OcrFields, FieldResult, OcrError

logger = logging.getLogger(__name__)

_PARSERS = {
    "national_id": (KenyanNationalIdParser(), NATIONAL_ID_CONFIG),
    "passport": (PassportParser(), PASSPORT_CONFIG),
    "driver_license": (DriverLicenseParser(), DRIVER_LICENSE_CONFIG),
}

_AUTO_ORDER = ["national_id", "passport", "driver_license"]


def _parsed_to_response(parsed: ParsedDocument, duration_ms: int) -> OcrResponse:
    """Map ParsedDocument → OcrResponse Pydantic model."""
    def fr(value: str | None, conf_key: str) -> FieldResult:
        return FieldResult(
            value=value or None,
            confidence=round(parsed.confidence.get(conf_key, 0.0), 3),
            raw=value,
        )

    fields = OcrFields(
        name=fr(parsed.name, "name"),
        id_number=fr(parsed.id_number, "id_number"),
        date_of_birth=fr(parsed.date_of_birth, "date_of_birth"),
        nationality=fr(parsed.nationality, "nationality"),
        sex=fr(parsed.sex, "sex"),
        expiry_date=fr(parsed.expiry_date, "expiry_date"),
        issue_date=fr(parsed.issue_date, "issue_date"),
        issuing_country=fr(parsed.issuing_country, "issuing_country"),
        address=fr(parsed.address, "address"),
    )

    populated_confs = [v for v in parsed.confidence.values() if v > 0]
    overall = round(sum(populated_confs) / len(populated_confs), 3) if populated_confs else 0.0

    has_any = any([parsed.name, parsed.id_number])

    return OcrResponse(
        success=has_any,
        doc_type=parsed.doc_type,  # type: ignore[arg-type]
        fields=fields,
        mrz=parsed.mrz_result,  # type: ignore[arg-type]
        overall_confidence=overall,
        warnings=parsed.warnings,
        error=None if has_any else OcrError(
            code="PARSE_FAILED",
            message="Could not extract identifying fields from this document.",
            recoverable=True,
        ),
        processing_ms=duration_ms,
    )


def _run_sync(image_bytes: bytes, doc_type: str) -> OcrResponse:
    start = time.monotonic()
    warnings: list[str] = []

    try:
        image = load_image(image_bytes)
    except Exception as exc:
        logger.error("Image load failed: %s", exc)
        return OcrResponse(
            success=False,
            error=OcrError(code="PARSE_FAILED", message="Could not decode the image.", recoverable=True),
            processing_ms=int((time.monotonic() - start) * 1000),
        )

    if doc_type == "auto":
        # Try each parser in order; return the first successful result.
        for candidate in _AUTO_ORDER:
            parser_obj, pipeline_cfg = _PARSERS[candidate]
            processed, pw = run_pipeline(image.copy(), pipeline_cfg)
            parsed = parser_obj.parse(processed, pw[:])
            if parsed.name or parsed.id_number:
                duration = int((time.monotonic() - start) * 1000)
                return _parsed_to_response(parsed, duration)
        # None succeeded — return last attempt (unknown).
        warnings.append("Could not automatically determine document type.")
        duration = int((time.monotonic() - start) * 1000)
        return OcrResponse(
            success=False,
            doc_type="unknown",
            warnings=warnings,
            error=OcrError(
                code="UNSUPPORTED_DOCUMENT",
                message="Could not classify or read this document.",
                recoverable=True,
            ),
            processing_ms=duration,
        )

    if doc_type not in _PARSERS:
        return OcrResponse(
            success=False,
            error=OcrError(
                code="UNSUPPORTED_DOCUMENT",
                message=f"Document type '{doc_type}' is not supported.",
                recoverable=False,
            ),
            processing_ms=int((time.monotonic() - start) * 1000),
        )

    parser_obj, pipeline_cfg = _PARSERS[doc_type]
    processed, pipeline_warnings = run_pipeline(image, pipeline_cfg)
    warnings.extend(pipeline_warnings)

    parsed = parser_obj.parse(processed, warnings)
    duration = int((time.monotonic() - start) * 1000)
    return _parsed_to_response(parsed, duration)


class TesseractProvider:
    async def process(self, image_bytes: bytes, doc_type: str) -> OcrResponse:
        loop = asyncio.get_running_loop()
        fn = partial(_run_sync, image_bytes, doc_type)
        return await asyncio.wait_for(
            loop.run_in_executor(None, fn),
            timeout=settings.tesseract_timeout_seconds,
        )
