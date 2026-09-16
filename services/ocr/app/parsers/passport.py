"""
Passport parser — two-pass: visual zone + MRZ.

ICAO 9303 mandates the MRZ in the bottom ~20% of the data page.
When MRZ checksum is valid, MRZ fields override OCR visual-zone fields
and receive a boosted confidence score (0.95).
"""
from __future__ import annotations

import logging
import re
from typing import Optional

import cv2
import numpy as np
import pandas as pd
import pytesseract
from pytesseract import Output

from .base import BaseParser, ParsedDocument
from ..confidence import field_confidence, MRZ_CHECKSUM_CONFIDENCE
from ..mrz.parser import parse_mrz

logger = logging.getLogger(__name__)

BODY_CONFIG = "--oem 3 --psm 6"
MRZ_CONFIG = "--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"

_SURNAME_RE = re.compile(r"SURNAME[:\s]+([A-Z\s\-]+)", re.IGNORECASE)
_GIVEN_RE = re.compile(r"GIVEN\s*NAMES?[:\s]+([A-Z\s\-]+)", re.IGNORECASE)
_PASSPORT_NO_RE = re.compile(r"PASSPORT\s*(?:NO\.?|NUMBER)[:\s]*([A-Z0-9]{6,12})", re.IGNORECASE)
_NATIONALITY_RE = re.compile(r"NATIONALITY[:\s]+([A-Z]{3,})", re.IGNORECASE)
_DOB_RE = re.compile(r"DATE\s*OF\s*BIRTH[:\s]*([\d/\-\.]+)", re.IGNORECASE)
_SEX_RE = re.compile(r"\bSEX[:\s]+(MALE|FEMALE|M|F)\b", re.IGNORECASE)
_EXPIRY_RE = re.compile(r"DATE\s*OF\s*EXPIR[YI][:\s]*([\d/\-\.]+)", re.IGNORECASE)
_ISSUE_RE = re.compile(r"DATE\s*OF\s*ISSUE[:\s]*([\d/\-\.]+)", re.IGNORECASE)
_COUNTRY_RE = re.compile(r"ISSUING\s*(?:STATE|COUNTRY|AUTHORITY)[:\s]+([A-Z]{2,3})", re.IGNORECASE)


def _extract(pattern: re.Pattern, text: str) -> Optional[str]:
    m = pattern.search(text)
    return m.group(1).strip() if m else None


def _crop_mrz_zone(image: np.ndarray) -> np.ndarray:
    """Crop the bottom 22% of the image where ICAO mandates the MRZ."""
    h = image.shape[0]
    return image[int(h * 0.78):, :]


def _extract_mrz_lines(mrz_image: np.ndarray) -> list[str]:
    """Run Tesseract on the MRZ crop and split into individual lines."""
    text = pytesseract.image_to_string(mrz_image, config=MRZ_CONFIG)
    lines = [ln.strip() for ln in text.splitlines() if len(ln.strip()) >= 30]
    return lines


class PassportParser(BaseParser):
    def parse(self, image: np.ndarray, warnings: list[str]) -> ParsedDocument:
        # Pass 1: OCR the full data page for visual zone fields.
        try:
            word_df: pd.DataFrame = pytesseract.image_to_data(
                image,
                config=BODY_CONFIG,
                output_type=Output.DATAFRAME,
            )
        except Exception as exc:
            logger.error("Tesseract failed on passport body: %s", exc)
            warnings.append("OCR engine returned an error.")
            return ParsedDocument(doc_type="passport", warnings=warnings)

        valid_words = word_df[word_df["conf"] > 0].copy()
        text = " ".join(valid_words["text"].dropna().astype(str).tolist()).upper()

        raw_surname = _extract(_SURNAME_RE, text)
        raw_given = _extract(_GIVEN_RE, text)
        raw_passport_no = _extract(_PASSPORT_NO_RE, text)
        raw_nationality = _extract(_NATIONALITY_RE, text)
        raw_dob = _extract(_DOB_RE, text)
        raw_sex_m = _SEX_RE.search(text)
        raw_sex = raw_sex_m.group(1).upper() if raw_sex_m else None
        raw_expiry = _extract(_EXPIRY_RE, text)
        raw_issue = _extract(_ISSUE_RE, text)
        raw_country = _extract(_COUNTRY_RE, text)

        # Assemble name from surname + given names.
        name_parts = []
        if raw_surname:
            name_parts.append(raw_surname.title())
        if raw_given:
            name_parts.append(raw_given.title())
        visual_name = " ".join(name_parts) if name_parts else None

        sex = ("M" if raw_sex in ("MALE", "M") else "F") if raw_sex else None

        conf: dict[str, float] = {
            "name": field_confidence(valid_words, visual_name),
            "id_number": field_confidence(valid_words, raw_passport_no),
            "date_of_birth": field_confidence(valid_words, raw_dob),
            "nationality": field_confidence(valid_words, raw_nationality),
            "sex": field_confidence(valid_words, raw_sex),
            "expiry_date": field_confidence(valid_words, raw_expiry),
            "issue_date": field_confidence(valid_words, raw_issue),
            "issuing_country": field_confidence(valid_words, raw_country),
            "address": 0.0,
        }

        # Pass 2: MRZ crop → parse.
        mrz_result = None
        try:
            mrz_crop = _crop_mrz_zone(image)
            mrz_lines = _extract_mrz_lines(mrz_crop)
            if len(mrz_lines) >= 2:
                mrz_result = parse_mrz(mrz_lines[0], mrz_lines[1])
        except Exception as exc:
            logger.debug("MRZ extraction failed: %s", exc)

        # Merge MRZ fields when checksum validates — MRZ is more reliable.
        if mrz_result and mrz_result.checksum_valid:
            if mrz_result.surname and mrz_result.given_names:
                visual_name = f"{mrz_result.given_names} {mrz_result.surname}"
                conf["name"] = MRZ_CHECKSUM_CONFIDENCE
            elif mrz_result.surname:
                visual_name = mrz_result.surname
                conf["name"] = MRZ_CHECKSUM_CONFIDENCE

            if mrz_result.passport_number:
                raw_passport_no = mrz_result.passport_number
                conf["id_number"] = MRZ_CHECKSUM_CONFIDENCE
            if mrz_result.date_of_birth:
                raw_dob = mrz_result.date_of_birth
                conf["date_of_birth"] = MRZ_CHECKSUM_CONFIDENCE
            if mrz_result.nationality:
                raw_nationality = mrz_result.nationality
                conf["nationality"] = MRZ_CHECKSUM_CONFIDENCE
            if mrz_result.sex:
                sex = mrz_result.sex
                conf["sex"] = MRZ_CHECKSUM_CONFIDENCE
            if mrz_result.expiry_date:
                raw_expiry = mrz_result.expiry_date
                conf["expiry_date"] = MRZ_CHECKSUM_CONFIDENCE

        name = self._clean_name(visual_name) if visual_name else None
        dob = (
            raw_dob
            if (mrz_result and mrz_result.checksum_valid and mrz_result.date_of_birth)
            else self._normalize_date(raw_dob) if raw_dob else None
        )
        expiry = (
            raw_expiry
            if (mrz_result and mrz_result.checksum_valid and mrz_result.expiry_date)
            else self._normalize_date(raw_expiry) if raw_expiry else None
        )
        issue = self._normalize_date(raw_issue) if raw_issue else None

        return ParsedDocument(
            doc_type="passport",
            name=name,
            id_number=raw_passport_no,
            date_of_birth=dob,
            nationality=raw_nationality,
            sex=sex,
            expiry_date=expiry,
            issue_date=issue,
            issuing_country=raw_country,
            confidence=conf,
            warnings=warnings,
            mrz_result=mrz_result,
        )
