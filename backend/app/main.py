"""Eco-Dispenser Inteligente — FastAPI Application Factory."""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import api_router
from app.core.config import CORS_ORIGINS, ESP32_BASE_URL, REQUEST_TIMEOUT
from app.core.database import engine
from app.models.domain import Base

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage shared httpx client lifecycle."""
    app.state.http_client = httpx.AsyncClient(
        base_url=ESP32_BASE_URL,
        timeout=REQUEST_TIMEOUT,
    )
    print(f"🚀 Backend iniciado — ESP32 target: {ESP32_BASE_URL}")
    yield
    await app.state.http_client.aclose()
    print("👋 Backend encerrado")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Eco-Dispenser API",
        description="Proxy backend para o ESP32-C3 Eco-Dispenser",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(api_router)

    return app


# Create the app instance
app = create_app()
