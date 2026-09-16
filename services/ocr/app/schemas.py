from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

DocType = Literal["national_id", "passport", "driver_license", "auto"]
DocTypeResult = Literal["national_id", "passport", "driver_license", "unknown"]
ErrorCode = Literal[
    "LOW_QUALITY_IMAGE",
    "DOCUMENT_NOT_DETECTED",
    "UNSUPPORTED_DOCUMENT",
    "PARSE_FAILED",
    "SERVICE_ERROR",
    "AUTH_REQUIRED",
    "INVALID_INPUT",
]


class OcrRequest(BaseModel):
    image_base64: str = Field(min_length=100)
    media_type: Literal["image/jpeg", "image/png"] = "image/jpeg"
    doc_type: DocType = "auto"


class FieldResult(BaseModel):
    value: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    raw: Optional[str] = None


class MrzResult(BaseModel):
    raw_lines: list[str]
    checksum_valid: bool
    surname: Optional[str] = None
    given_names: Optional[str] = None
    passport_number: Optional[str] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[str] = None
    sex: Optional[str] = None
    expiry_date: Optional[str] = None


class OcrError(BaseModel):
    code: ErrorCode
    message: str
    recoverable: bool = True


class OcrFields(BaseModel):
    name: FieldResult = Field(default_factory=FieldResult)
    id_number: FieldResult = Field(default_factory=FieldResult)
    date_of_birth: FieldResult = Field(default_factory=FieldResult)
    nationality: FieldResult = Field(default_factory=FieldResult)
    sex: FieldResult = Field(default_factory=FieldResult)
    expiry_date: FieldResult = Field(default_factory=FieldResult)
    issue_date: FieldResult = Field(default_factory=FieldResult)
    issuing_country: FieldResult = Field(default_factory=FieldResult)
    address: FieldResult = Field(default_factory=FieldResult)


class OcrResponse(BaseModel):
    schema_version: str = "1.0"
    success: bool
    doc_type: DocTypeResult = "unknown"
    fields: OcrFields = Field(default_factory=OcrFields)
    mrz: Optional[MrzResult] = None
    overall_confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    warnings: list[str] = Field(default_factory=list)
    error: Optional[OcrError] = None
    processing_ms: int = 0


class HealthResponse(BaseModel):
    status: str = "ok"
    demo_mode: bool = False


class ReadyResponse(BaseModel):
    ready: bool
    tesseract_version: Optional[str] = None
    error: Optional[str] = None
