"""
Thin wrapper around the `mrz` PyPI library (>=0.6) for TD3 (passport) MRZ parsing.
Only TD3 (two-line, 44-char passport) is handled here.
"""
from __future__ import annotations

import logging
from typing import Optional

from ..schemas import MrzResult

logger = logging.getLogger(__name__)


def _mrz_date(d: str | None) -> Optional[str]:
    """Convert YYMMDD → YYYY-MM-DD with a century heuristic (≤30 → 2000s)."""
    if not d or len(d) != 6:
        return None
    yy, mm, dd = d[:2], d[2:4], d[4:]
    try:
        year = int(yy)
        month = int(mm)
        day = int(dd)
        if not (1 <= month <= 12 and 1 <= day <= 31):
            return None
        century = 2000 if year <= 31 else 1900
        return f"{century + year:04d}-{mm}-{dd}"
    except ValueError:
        return None


def parse_mrz(line1: str, line2: str) -> Optional[MrzResult]:
    """
    Parse a TD3 passport MRZ from two raw OCR lines.
    Returns None if lines are malformed or the library raises.
    """
    try:
        from mrz.checker.td3 import TD3CodeChecker  # type: ignore[import]

        # Reject lines that are clearly too short to be MRZ (< 30 raw chars after strip).
        if len(line1.strip()) < 30 or len(line2.strip()) < 30:
            return None

        # Normalize: strip whitespace, replace spaces with < (common OCR substitution),
        # uppercase, and pad/truncate to exactly 44 chars.
        def _normalize(line: str) -> str:
            return line.strip().replace(" ", "<").upper().ljust(44, "<")[:44]

        l1 = _normalize(line1)
        l2 = _normalize(line2)

        # TD3CodeChecker expects exactly 89 chars: 44 + newline + 44.
        mrz_str = l1 + "\n" + l2
        if len(mrz_str) != 89:
            logger.debug("MRZ string wrong length: %d", len(mrz_str))
            return None

        checker = TD3CodeChecker(mrz_str)
        fields = checker.fields()
        checksum_valid = bool(checker.result)

        surname = str(fields.surname).replace("<", " ").strip() or None
        given_names = str(fields.name).replace("<", " ").strip() or None

        return MrzResult(
            raw_lines=[l1, l2],
            checksum_valid=checksum_valid,
            surname=surname,
            given_names=given_names,
            passport_number=str(fields.document_number).strip() or None,
            nationality=str(fields.nationality).strip() or None,
            date_of_birth=_mrz_date(str(fields.birth_date)),
            sex=str(fields.sex).strip() or None,
            expiry_date=_mrz_date(str(fields.expiry_date)),
        )
    except Exception as exc:
        logger.debug("MRZ parsing failed: %s", exc)
        return None
