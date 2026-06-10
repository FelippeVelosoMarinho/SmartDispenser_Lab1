"""Application configuration."""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── JWT / Auth Settings ──────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# ─── Database Configuration ───────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./smart_dispenser.db")

# ─── ESP32 Configuration ──────────────────────────────────────────────
ESP32_IP = os.getenv("ESP32_IP", "192.168.109.25")
ESP32_BASE_URL = f"http://{ESP32_IP}"
REQUEST_TIMEOUT = 5.0  # seconds

# ─── Period dispense schedule (defaults for testing) ─────────────────
DISPENSE_PERIOD_MORNING = os.getenv("DISPENSE_PERIOD_MORNING", "21:00")
DISPENSE_PERIOD_AFTERNOON = os.getenv("DISPENSE_PERIOD_AFTERNOON", "21:01")
DISPENSE_PERIOD_NIGHT = os.getenv("DISPENSE_PERIOD_NIGHT", "21:02")
SCHEDULER_POLL_SECONDS = int(os.getenv("SCHEDULER_POLL_SECONDS", "10"))
SCHEDULER_DUE_WINDOW_SECONDS = int(os.getenv("SCHEDULER_DUE_WINDOW_SECONDS", "120"))
# Max seconds before scheduled time (0 = never fire before countdown reaches zero).
SCHEDULER_EARLY_SLACK_SECONDS = int(os.getenv("SCHEDULER_EARLY_SLACK_SECONDS", "0"))
# Extra slack after scheduled time while patient has not confirmed previous dose.
SCHEDULER_AWAITING_CONFIRM_GRACE_SECONDS = int(
    os.getenv("SCHEDULER_AWAITING_CONFIRM_GRACE_SECONDS", "120")
)
# Lab only: enqueue next dose even if DB says awaiting_confirm (needs firmware lab mode too).
SCHEDULER_IGNORE_AWAITING_CONFIRM = os.getenv(
    "SCHEDULER_IGNORE_AWAITING_CONFIRM", "false"
).lower() in ("1", "true", "yes")
SCHEDULER_DEDUP_SECONDS = int(os.getenv("SCHEDULER_DEDUP_SECONDS", "180"))
TOTAL_CAROUSEL_SLOTS = 21
SCHEDULER_MODE = os.getenv("SCHEDULER_MODE", "queue")  # queue | push
COMMAND_ACK_TIMEOUT_SECONDS = int(os.getenv("COMMAND_ACK_TIMEOUT_SECONDS", "900"))
# IANA timezone for period schedules (HH:MM wall clock). Default: Brazil.
SCHEDULER_TIMEZONE = os.getenv("SCHEDULER_TIMEZONE", "America/Sao_Paulo")

# ─── CORS Configuration ───────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:8082",
    "https://pill.josoesantos.dev",
    "http://pill.josoesantos.dev",
]
_extra_cors = os.getenv("CORS_ORIGINS", "")
if _extra_cors:
    CORS_ORIGINS.extend(
        origin.strip() for origin in _extra_cors.split(",") if origin.strip()
    )

# ─── SMTP / Notification Configuration ──────────────────────────────────
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "smart.dispenser.ufmg@gmail.com")
SMTP_PASSWORD = os.getenv("APP_PASSWORD_GOOGLE", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Smart Dispenser <smart.dispenser.ufmg@gmail.com>")

