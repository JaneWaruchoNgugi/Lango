"""
MockProvider — returns realistic Kenyan demo data.
Used when OCR_DEMO_MODE=true so the service can be tested without
Tesseract installed or a real document image.
"""
from __future__ import annotations

import asyncio
import random

from ..schemas import OcrResponse, OcrFields, FieldResult, MrzResult

_SAMPLES = [
    OcrResponse(
        success=True,
        doc_type="national_id",
        fields=OcrFields(
            name=FieldResult(value="Grace Wanjiku Kariuki", confidence=0.96, raw="GRACE WANJIKU KARIUKI"),
            id_number=FieldResult(value="34521876", confidence=0.94, raw="34521876"),
            date_of_birth=FieldResult(value="1994-03-22", confidence=0.90, raw="22/03/1994"),
            sex=FieldResult(value="F", confidence=0.93, raw="F"),
            nationality=FieldResult(value="KENYAN", confidence=1.0, raw="KENYAN"),
            issue_date=FieldResult(value="2015-06-10", confidence=0.85, raw="10/06/2015"),
        ),
        overall_confidence=0.93,
        warnings=[],
    ),
    OcrResponse(
        success=True,
        doc_type="passport",
        fields=OcrFields(
            name=FieldResult(value="David Otieno Mwangi", confidence=0.98, raw="DAVID OTIENO MWANGI"),
            id_number=FieldResult(value="B98765432", confidence=0.96, raw="B98765432"),
            date_of_birth=FieldResult(value="1988-11-07", confidence=0.94, raw="07/11/1988"),
            sex=FieldResult(value="M", confidence=0.95, raw="M"),
            nationality=FieldResult(value="KEN", confidence=0.93, raw="KEN"),
            expiry_date=FieldResult(value="2031-11-07", confidence=0.95, raw="07/11/2031"),
            issue_date=FieldResult(value="2021-11-07", confidence=0.90, raw="07/11/2021"),
            issuing_country=FieldResult(value="KEN", confidence=0.92, raw="KEN"),
        ),
        mrz=MrzResult(
            raw_lines=[
                "P<KENMWANGI<<DAVID<OTIENO<<<<<<<<<<<<<<<<<<<",
                "B98765432<KEN8811078M3111076<<<<<<<<<<<<<<2",
            ],
            checksum_valid=True,
            surname="Mwangi",
            given_names="David Otieno",
            passport_number="B98765432",
            nationality="KEN",
            date_of_birth="1988-11-07",
            sex="M",
            expiry_date="2031-11-07",
        ),
        overall_confidence=0.95,
        warnings=["Document boundary could not be confidently detected."],
    ),
    OcrResponse(
        success=True,
        doc_type="national_id",
        fields=OcrFields(
            name=FieldResult(value="Samuel Kipchoge Rotich", confidence=0.65, raw="SAMUEL KIPCHOGE ROTICH"),
            id_number=FieldResult(value="29114503", confidence=0.60, raw="29114503"),
            date_of_birth=FieldResult(value="2001-06-15", confidence=0.58, raw="15/06/2001"),
            sex=FieldResult(value="M", confidence=0.80, raw="M"),
            nationality=FieldResult(value="KENYAN", confidence=1.0, raw="KENYAN"),
        ),
        overall_confidence=0.61,
        warnings=["Low image quality detected. Please retake the photo."],
    ),
]

_index = 0


class MockProvider:
    async def process(self, image_bytes: bytes, doc_type: str) -> OcrResponse:
        global _index
        await asyncio.sleep(0.8)  # Simulate realistic processing delay.
        # Apply ±0.03 jitter to confidence scores so demo feels live.
        sample = _SAMPLES[_index % len(_SAMPLES)].model_copy(deep=True)
        _index += 1
        jitter = random.uniform(-0.03, 0.03)
        sample.overall_confidence = round(
            max(0.0, min(1.0, sample.overall_confidence + jitter)), 3
        )
        return sample
