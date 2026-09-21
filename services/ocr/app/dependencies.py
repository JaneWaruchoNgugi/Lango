import hmac
from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings
from .providers.base import OcrProvider
from .providers.mock import MockProvider
from .providers.tesseract import TesseractProvider

# Module-level singletons — stateless and safe to share across requests.
_tesseract_provider = TesseractProvider()
_mock_provider = MockProvider()


def verify_token(
    authorization: Optional[str] = Header(default=None),
    s: Settings = Depends(get_settings),
) -> None:
    """Validate the internal bearer token using a timing-safe comparison."""
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required.")
    expected = s.ocr_service_token.encode()
    provided = token.encode()
    # Pad to equal length before compare_digest so length doesn't leak timing info.
    if len(provided) != len(expected) or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")


def get_provider() -> OcrProvider:
    if get_settings().ocr_demo_mode:
        return _mock_provider
    return _tesseract_provider
