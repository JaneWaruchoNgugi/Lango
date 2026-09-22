"""Base parser interface."""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import numpy as np


@dataclass
class ParsedDocument:
    """Structured output from any document parser."""
    doc_type: str = "unknown"
    name: Optional[str] = None
    id_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    sex: Optional[str] = None
    expiry_date: Optional[str] = None
    issue_date: Optional[str] = None
    issuing_country: Optional[str] = None
    address: Optional[str] = None
    # Per-field confidence (0.0–1.0) populated by each parser.
    confidence: dict[str, float] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    mrz_result: Optional[object] = None  # MrzResult when applicable


class BaseParser(ABC):
    @abstractmethod
    def parse(self, image: np.ndarray, warnings: list[str]) -> ParsedDocument:
        """Parse an already-preprocessed grayscale/binary image."""

    @staticmethod
    def _normalize_date(raw: str) -> Optional[str]:
        """
        Attempt to convert common date formats to YYYY-MM-DD.
        Handles: DD/MM/YYYY, DD-MM-YYYY, DDMMYYYY.
        """
        raw = raw.strip().replace(" ", "")
        patterns = [
            (r"(\d{2})[/\-\.](\d{2})[/\-\.](\d{4})", lambda m: f"{m.group(3)}-{m.group(2)}-{m.group(1)}"),
            (r"(\d{4})[/\-\.](\d{2})[/\-\.](\d{2})", lambda m: f"{m.group(1)}-{m.group(2)}-{m.group(3)}"),
            (r"(\d{2})(\d{2})(\d{4})", lambda m: f"{m.group(3)}-{m.group(2)}-{m.group(1)}"),
        ]
        for pattern, formatter in patterns:
            m = re.match(pattern, raw)
            if m:
                try:
                    return formatter(m)
                except Exception:
                    continue
        return None

    @staticmethod
    def _clean_name(raw: str) -> Optional[str]:
        """Normalize a name: title-case, remove OCR artifacts."""
        name = re.sub(r"[^A-Za-z\s\-']", "", raw).strip()
        name = re.sub(r"\s+", " ", name)
        if len(name) < 2:
            return None
        return name.title()
