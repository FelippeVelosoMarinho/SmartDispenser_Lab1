"""API router aggregator."""

from fastapi import APIRouter

from app.api.endpoints import auth, iot

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(iot.router)
