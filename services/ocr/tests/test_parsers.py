"""
Parser unit tests using synthetic OCR output (no real document images required).
Tests focus on the pure field-extraction logic, not Tesseract itself.
"""
import pandas as pd
import pytest

from app.parsers.base import BaseParser


class ConcreteParser(BaseParser):
    """Minimal subclass to test BaseParser static methods."""
    def parse(self, image, warnings):
        return None


parser = ConcreteParser()


# ---- _normalize_date ----

@pytest.mark.parametrize("raw,expected", [
    ("22/03/1994", "1994-03-22"),
    ("22-03-1994", "1994-03-22"),
    ("22.03.1994", "1994-03-22"),
    ("1994-03-22", "1994-03-22"),
    ("1994/03/22", "1994-03-22"),
    ("22031994",   "1994-03-22"),
])
def test_normalize_date_valid(raw: str, expected: str) -> None:
    assert parser._normalize_date(raw) == expected


@pytest.mark.parametrize("raw", ["not-a-date", "", "99/99/9999", "abc"])
def test_normalize_date_invalid(raw: str) -> None:
    result = parser._normalize_date(raw)
    # Either None or any string — no exception
    assert result is None or isinstance(result, str)


# ---- _clean_name ----

@pytest.mark.parametrize("raw,expected", [
    ("JOHN KAMAU", "John Kamau"),
    ("  jane  warucho  ", "Jane Warucho"),
    ("O'BRIEN", "O'Brien"),
])
def test_clean_name_valid(raw: str, expected: str) -> None:
    assert parser._clean_name(raw) == expected


@pytest.mark.parametrize("raw", ["X", "1234", "!@#$"])
def test_clean_name_short_or_invalid(raw: str) -> None:
    assert parser._clean_name(raw) is None


# ---- field_confidence ----

from app.confidence import field_confidence


def _make_word_df(words: list[tuple[str, int]]) -> pd.DataFrame:
    """Create a minimal word DataFrame like pytesseract returns."""
    return pd.DataFrame({"text": [w[0] for w in words], "conf": [w[1] for w in words]})


def test_field_confidence_perfect_match() -> None:
    df = _make_word_df([("JOHN", 95), ("KAMAU", 92)])
    score = field_confidence(df, "JOHN KAMAU")
    assert 0.9 <= score <= 1.0


def test_field_confidence_empty_value() -> None:
    df = _make_word_df([("JOHN", 95)])
    assert field_confidence(df, None) == 0.0
    assert field_confidence(df, "") == 0.0


def test_field_confidence_no_match() -> None:
    df = _make_word_df([("ALICE", 90)])
    score = field_confidence(df, "BOB")
    assert score == 0.0


def test_field_confidence_empty_df() -> None:
    df = pd.DataFrame({"text": [], "conf": []})
    assert field_confidence(df, "JOHN") == 0.0


def test_field_confidence_rejected_words() -> None:
    """Tesseract marks rejected words with conf=-1; they should be excluded."""
    df = _make_word_df([("JOHN", -1), ("KAMAU", 85)])
    score = field_confidence(df, "JOHN KAMAU")
    # Only KAMAU matches with valid conf; JOHN has conf=-1 so no match.
    assert score > 0.0
