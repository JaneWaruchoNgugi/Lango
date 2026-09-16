"""
Kenyan National ID card parser.

Kenyan IDs print all fields in English with Swahili label variants.
Key labels (English / Swahili):
  NAME / JINA                         → full_name
  ID NUMBER / NAMBARI YA KITAMBULISHO → 7–8 digit ID (NOT the 9-digit serial)
  DATE OF BIRTH / TAREHE YA KUZALIWA  → DD/MM/YYYY
  SEX / JINSIA                        → M / F
  DATE OF ISSUE / TAREHE YA KUTOLEWA  → DD/MM/YYYY
  DISTRICT OF BIRTH / WILAYA          → used as address proxy
  NATIONALITY / UTAIFA                → usually KENYAN

National IDs do NOT have expiry dates or MRZ.
"""
from __future__ import annotations

import logging
import re
from typing import Optional

import numpy as np
import pandas as pd
import pytesseract
from pytesseract import Output

from .base import BaseParser, ParsedDocument
from ..confidence import field_confidence
from ..pipeline.config import NATIONAL_ID_CONFIG

logger = logging.getLogger(__name__)

TESSERACT_CONFIG = "--oem 3 --psm 6"

# Regex to find the 7-8 digit ID number preceded by a known label.
_ID_NUM_RE = re.compile(
    r"(?:ID\s*NUMBER|NAMBARI\s*YA\s*KITAMBULISHO)[:\s]*(\d{7,8})",
    re.IGNORECASE,
)
# Serial number is 9 digits — explicitly excluded.
_SERIAL_RE = re.compile(r"SERIAL\s*(?:NUMBER|NO)[:\s]*\d{9}", re.IGNORECASE)

_DOB_RE = re.compile(
    r"(?:DATE\s*OF\s*BIRTH|TAREHE\s*YA\s*KUZALIWA)[:\s]*([\d/\-\.]+)",
    re.IGNORECASE,
)
_SEX_RE = re.compile(
    r"(?:^|SEX|JINSIA)[:\s]*(MALE|FEMALE|M|F)\b",
    re.IGNORECASE | re.MULTILINE,
)
_ISSUE_RE = re.compile(
    r"(?:DATE\s*OF\s*ISSUE|TAREHE\s*YA\s*KUTOLEWA)[:\s]*([\d/\-\.]+)",
    re.IGNORECASE,
)
_NATIONALITY_RE = re.compile(
    r"(?:NATIONALITY|UTAIFA)[:\s]*(KENYAN|KENYA|KEN)",
    re.IGNORECASE,
)
# Name appears after "FULL NAME" / "JINA" or at the top of the card.
_NAME_RE = re.compile(
    r"(?:FULL\s*NAME|JINA\s*KAMILI|JINA)[:\s]+([A-Z][A-Z\s\-]{2,50})",
    re.IGNORECASE,
)
_DISTRICT_RE = re.compile(
    r"(?:DISTRICT\s*OF\s*BIRTH|WILAYA)[:\s]+([A-Z][A-Z\s\-]{2,40})",
    re.IGNORECASE,
)


def _extract(pattern: re.Pattern, text: str) -> Optional[str]:
    m = pattern.search(text)
    return m.group(1).strip() if m else None


class KenyanNationalIdParser(BaseParser):
    def parse(self, image: np.ndarray, warnings: list[str]) -> ParsedDocument:
        try:
            word_df: pd.DataFrame = pytesseract.image_to_data(
                image,
                config=TESSERACT_CONFIG,
                output_type=Output.DATAFRAME,
            )
        except Exception as exc:
            logger.error("Tesseract failed on national_id: %s", exc)
            warnings.append("OCR engine returned an error.")
            return ParsedDocument(doc_type="national_id", warnings=warnings)

        # Filter out low-confidence and empty words.
        valid_words = word_df[word_df["conf"] > 0].copy()
        text = " ".join(valid_words["text"].dropna().astype(str).tolist()).upper()

        # Strip serial number lines so they don't pollute ID number extraction.
        text = _SERIAL_RE.sub("", text)

        raw_name = _extract(_NAME_RE, text)
        raw_id = _extract(_ID_NUM_RE, text)
        raw_dob = _extract(_DOB_RE, text)
        raw_sex_m = _SEX_RE.search(text)
        raw_sex = raw_sex_m.group(1).upper() if raw_sex_m else None
        raw_issue = _extract(_ISSUE_RE, text)
        raw_nationality = _extract(_NATIONALITY_RE, text)
        raw_district = _extract(_DISTRICT_RE, text)

        name = self._clean_name(raw_name) if raw_name else None
        dob = self._normalize_date(raw_dob) if raw_dob else None
        issue = self._normalize_date(raw_issue) if raw_issue else None
        sex = ("M" if raw_sex in ("MALE", "M") else "F") if raw_sex else None
        nationality = "KENYAN" if raw_nationality else None

        conf: dict[str, float] = {
            "name": field_confidence(valid_words, name),
            "id_number": field_confidence(valid_words, raw_id),
            "date_of_birth": field_confidence(valid_words, raw_dob),
            "nationality": 1.0 if nationality else 0.0,  # derived, not OCR'd
            "sex": field_confidence(valid_words, raw_sex),
            "issue_date": field_confidence(valid_words, raw_issue),
            "expiry_date": 0.0,
            "issuing_country": 0.0,
            "address": field_confidence(valid_words, raw_district),
        }

        avg_conf = sum(v for v in conf.values() if v > 0) / max(
            sum(1 for v in conf.values() if v > 0), 1
        )
        if avg_conf < (NATIONAL_ID_CONFIG.min_avg_confidence / 100):
            warnings.append("Low image quality detected. Please retake the photo.")

        return ParsedDocument(
            doc_type="national_id",
            name=name,
            id_number=raw_id,
            date_of_birth=dob,
            nationality=nationality,
            sex=sex,
            issue_date=issue,
            address=raw_district.title() if raw_district else None,
            confidence=conf,
            warnings=warnings,
        )
