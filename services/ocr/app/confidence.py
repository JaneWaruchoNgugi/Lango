"""
Derive per-field confidence scores from Tesseract word-level data.

Tesseract image_to_data returns a DataFrame with columns including
'text' and 'conf' (integer 0-100, -1 = rejected). For each extracted
field value, we find the matching words and average their confidence.
MRZ-validated fields receive an override of 0.95 (checksum is a stronger
signal than pixel confidence).
"""
from __future__ import annotations

import pandas as pd


def field_confidence(word_df: pd.DataFrame, matched_text: str | None) -> float:
    """Return 0.0–1.0 confidence for `matched_text` against Tesseract word data."""
    if not matched_text or word_df.empty:
        return 0.0
    tokens = matched_text.upper().split()
    confs: list[float] = []
    for token in tokens:
        mask = word_df["text"].str.upper() == token
        valid = word_df.loc[mask & (word_df["conf"] > 0), "conf"]
        if not valid.empty:
            confs.append(float(valid.mean()) / 100.0)
    return round(sum(confs) / len(confs), 3) if confs else 0.0


MRZ_CHECKSUM_CONFIDENCE = 0.95
