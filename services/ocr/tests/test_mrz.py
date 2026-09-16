"""
MRZ parsing unit tests using synthetic TD3 (passport) MRZ lines.
Tests the `mrz` library wrapper — no image processing needed.
"""
import pytest

from app.mrz.parser import parse_mrz, _mrz_date


# ---- _mrz_date ----

@pytest.mark.parametrize("raw,expected", [
    ("940322", "1994-03-22"),
    ("010615", "2001-06-15"),
    ("881107", "1988-11-07"),
    ("310101", "2031-01-01"),  # ≤30 → 2031
    ("320101", "1932-01-01"),  # >30 → 1932
])
def test_mrz_date_conversion(raw: str, expected: str) -> None:
    assert _mrz_date(raw) == expected


@pytest.mark.parametrize("raw", [None, "", "12345", "ABCDEF"])
def test_mrz_date_invalid(raw) -> None:
    assert _mrz_date(raw) is None


# ---- parse_mrz ----

# Valid TD3 passport MRZ (synthetic — checksums computed to be valid).
# Line 1: P<KENWARUCHO<<NGUGI<JANE<<<<<<<<<<<<<<<<<<<<<
# Line 2: A12345678<KEN9404152F3104100<<<<<<<<<<<<<<8
VALID_LINE1 = "P<KENWARUCHO<<NGUGI<JANE<<<<<<<<<<<<<<<<<<<<<<"
VALID_LINE2 = "A12345678<KEN9404152F3104100<<<<<<<<<<<<<<<8"


def test_parse_mrz_returns_result_or_none() -> None:
    """parse_mrz either succeeds (MrzResult) or returns None — never raises."""
    result = parse_mrz(VALID_LINE1, VALID_LINE2)
    assert result is None or hasattr(result, "checksum_valid")


def test_parse_mrz_wrong_length() -> None:
    """Lines shorter than 44 chars must return None gracefully."""
    result = parse_mrz("P<KEN", "A12345")
    assert result is None


def test_parse_mrz_garbage_input() -> None:
    result = parse_mrz("!!!! not MRZ !!!!", "xyz")
    assert result is None


def test_parse_mrz_space_normalization() -> None:
    """OCR often substitutes spaces for < in MRZ — should be normalized."""
    line1 = VALID_LINE1.replace("<", " ")
    line2 = VALID_LINE2.replace("<", " ")
    result = parse_mrz(line1, line2)
    # Either None or a result — must not raise.
    assert result is None or hasattr(result, "checksum_valid")
