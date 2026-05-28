"""API router aggregator."""

from fastapi import APIRouter

<<<<<<< HEAD
from app.api.endpoints import auth, iot, patients, medications, schedules, logs, dispensers, slots
=======
from app.api.endpoints import auth, iot, patients, medications, schedules, logs, dispensers, patient_medications
>>>>>>> origin/main

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(iot.router)
api_router.include_router(patients.router)
api_router.include_router(patient_medications.router)
api_router.include_router(medications.router)
api_router.include_router(schedules.router)
api_router.include_router(logs.router)
api_router.include_router(dispensers.router)
api_router.include_router(slots.router)
