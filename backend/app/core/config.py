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

# ─── CORS Configuration ───────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# ─── SMTP / Notification Configuration ──────────────────────────────────
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "smart.dispenser.ufmg@gmail.com")
SMTP_PASSWORD = os.getenv("APP_PASSWORD_GOOGLE", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Smart Dispenser <smart.dispenser.ufmg@gmail.com>")

