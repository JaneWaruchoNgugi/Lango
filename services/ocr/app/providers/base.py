from typing import Protocol, runtime_checkable
from ..schemas import OcrResponse


@runtime_checkable
class OcrProvider(Protocol):
    async def process(self, image_bytes: bytes, doc_type: str) -> OcrResponse: ...
