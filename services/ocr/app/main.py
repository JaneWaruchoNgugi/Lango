"""
FastAPI application factory for the Lango OCR microservice.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import settings
from .router import router
from .schemas import OcrResponse, OcrError

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lango OCR Service",
        description="Internal document OCR for the Lango property-management platform.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.include_router(router)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logging.getLogger(__name__).error("Unhandled exception: %s", exc, exc_info=True)
        # Always return HTTP 200 with a structured error body so the Cloud Function
        # can always parse the response (never fails on network.ok check).
        response = OcrResponse(
            success=False,
            error=OcrError(
                code="SERVICE_ERROR",
                message="An internal error occurred.",
                recoverable=True,
            ),
        )
        return JSONResponse(status_code=200, content=response.model_dump())

    return app


app = create_app()
