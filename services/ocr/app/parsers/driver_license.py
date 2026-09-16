"""
Driver's License parser.

Kenyan DLs follow NTSA format with fields:
  FULL NAME, LICENSE NO, DATE OF BIRTH, DATE OF ISSUE,
  DATE OF EXPIRY, CLASS/CATEGORY, ADDRESS
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

logger = logging.getLogger(__name__)

TESSERACT_CONFIG = "--oem 3 --psm 6"

# License number: 6–12 alphanumeric chars (Kenyan DL format: e.g., DL123456)
_LICENSE_RE = re.compile(
    r"(?:LICENSE\s*(?:NO\.?|NUMBER)|LESENI\s*(?:NA\.|NAMBARI))[:\s]*([A-Z0-9]{6,12})",
    re.IGNORECASE,
)
_NAME_RE = re.compile(
    r"(?:FULL\s*NAME|JINA\s*KAMILI|SURNAME|HOLDER)[:\s]+([A-Z][A-Z\s\-]{2,60})",
    re.IGNORECASE,
)
_DOB_RE = re.compile(r"DATE\s*OF\s*BIRTH[:\s]*([\d/\-\.]+)", re.IGNORECASE)
_ISSUE_RE = re.compile(r"DATE\s*OF\s*ISSUE[:\s]*([\d/\-\.]+)", re.IGNORECASE)
_EXPIRY_RE = re.compile(r"DATE\s*OF\s*EXPIRY?[:\s]*([\d/\-\.]+)", re.IGNORECASE)
_CLASS_RE = re.compile(r"(?:CLASS|CATEGORY)[:\s]+([A-Z0-9,\s]{1,20})", re.IGNORECASE)
_ADDRESS_RE = re.compile(r"(?:ADDRESS|P\.?\s*O\.?\s*BOX)[:\s]+(.+?)(?:\n|$)", re.IGNORECASE)
_NATIONALITY_RE = re.compile(r"NATIONALITY[:\s]+([A-Z]{3,})", re.IGNORECASE)


def _extract(pattern: re.Pattern, text: str) -> Optional[str]:
    m = pattern.search(text)
    return m.group(1).strip() if m else None


class DriverLicenseParser(BaseParser):
    def parse(self, image: np.ndarray, warnings: list[str]) -> ParsedDocument:
        try:
            word_df: pd.DataFrame = pytesseract.image_to_data(
                image,
                config=TESSERACT_CONFIG,
                output_type=Output.DATAFRAME,
            )
        except Exception as exc:
            logger.error("Tesseract failed on driver_license: %s", exc)
            warnings.append("OCR engine returned an error.")
            return ParsedDocument(doc_type="driver_license", warnings=warnings)

        valid_words = word_df[word_df["conf"] > 0].copy()
        text = " ".join(valid_words["text"].dropna().astype(str).tolist()).upper()

        raw_name = _extract(_NAME_RE, text)
        raw_license = _extract(_LICENSE_RE, text)
        raw_dob = _extract(_DOB_RE, text)
        raw_issue = _extract(_ISSUE_RE, text)
        raw_expiry = _extract(_EXPIRY_RE, text)
        raw_address = _extract(_ADDRESS_RE, text)
        raw_nationality = _extract(_NATIONALITY_RE, text)

        name = self._clean_name(raw_name) if raw_name else None
        dob = self._normalize_date(raw_dob) if raw_dob else None
        issue = self._normalize_date(raw_issue) if raw_issue else None
        expiry = self._normalize_date(raw_expiry) if raw_expiry else None

        # Validate license number format.
        if raw_license and not re.match(r"^[A-Z0-9]{6,12}$", raw_license):
            warnings.append("License number format could not be validated.")
            raw_license = None

        conf: dict[str, float] = {
            "name": field_confidence(valid_words, name),
            "id_number": field_confidence(valid_words, raw_license),
            "date_of_birth": field_confidence(valid_words, raw_dob),
            "nationality": field_confidence(valid_words, raw_nationality),
            "sex": 0.0,
            "expiry_date": field_confidence(valid_words, raw_expiry),
            "issue_date": field_confidence(valid_words, raw_issue),
            "issuing_country": 0.0,
            "address": field_confidence(valid_words, raw_address),
        }

        return ParsedDocument(
            doc_type="driver_license",
            name=name,
            id_number=raw_license,
            date_of_birth=dob,
            nationality=raw_nationality,
            expiry_date=expiry,
            issue_date=issue,
            address=raw_address.title() if raw_address else None,
            confidence=conf,
            warnings=warnings,
        )
