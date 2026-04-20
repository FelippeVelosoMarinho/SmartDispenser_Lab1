"""
Eco-Dispenser Inteligente — Backend Proxy (FastAPI)

Atua como proxy entre o Frontend e o ESP32-C3,
traduzindo comandos REST em sinais para o microcontrolador.
"""

import os
import time
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Environment ──────────────────────────────────────────────────────
load_dotenv()

ESP32_IP = os.getenv("ESP32_IP", "192.168.109.25")
ESP32_BASE_URL = f"http://{ESP32_IP}"
REQUEST_TIMEOUT = 5.0  # seconds


# ─── HTTP Client (shared) ────────────────────────────────────────────
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


# ─── FastAPI App ──────────────────────────────────────────────────────
app = FastAPI(
    title="Eco-Dispenser API",
    description="Proxy backend para o ESP32-C3 Eco-Dispenser",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────
class LedCommand(BaseModel):
    """Payload to toggle the LED."""
    state: str  # "on" or "off"


class LedStatusResponse(BaseModel):
    """Response from LED status query."""
    led: bool
    hardware_reachable: bool = True
    latency_ms: float | None = None


class ToggleResponse(BaseModel):
    """Response after toggling the LED."""
    led: bool
    success: bool
    hardware_reachable: bool = True
    latency_ms: float | None = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    esp32_ip: str
    esp32_reachable: bool


# ─── Routes ───────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check — also pings ESP32 to verify connectivity."""
    client: httpx.AsyncClient = app.state.http_client
    esp32_reachable = False

    try:
        response = await client.get("/status")
        esp32_reachable = response.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    return HealthResponse(
        status="ok",
        esp32_ip=ESP32_IP,
        esp32_reachable=esp32_reachable,
    )


@app.get("/api/led/status", response_model=LedStatusResponse)
async def get_led_status():
    """Fetch current LED status from ESP32."""
    client: httpx.AsyncClient = app.state.http_client

    try:
        start = time.perf_counter()
        response = await client.get("/status")
        latency = (time.perf_counter() - start) * 1000  # ms

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"ESP32 returned status {response.status_code}",
            )

        data = response.json()
        return LedStatusResponse(
            led=data.get("led", False),
            hardware_reachable=True,
            latency_ms=round(latency, 2),
        )

    except httpx.ConnectError as e:
        print(f"❌ Erro de conexão com ESP32: {e}")
        return LedStatusResponse(
            led=False,
            hardware_reachable=False,
            latency_ms=None,
        )
    except httpx.TimeoutException:
        print("❌ Timeout na resposta do ESP32")
        return LedStatusResponse(
            led=False,
            hardware_reachable=False,
            latency_ms=None,
        )
    except Exception as e:
        print(f"❌ Erro inesperado no status: {e}")
        return LedStatusResponse(
            led=False,
            hardware_reachable=False,
            latency_ms=None,
        )


@app.post("/api/led/toggle", response_model=ToggleResponse)
async def toggle_led(command: LedCommand):
    """Send ON/OFF command to ESP32 LED."""
    if command.state not in ("on", "off"):
        raise HTTPException(
            status_code=400,
            detail="Invalid state. Use 'on' or 'off'.",
        )

    client: httpx.AsyncClient = app.state.http_client

    try:
        start = time.perf_counter()
        response = await client.post(
            "/led",
            json={"state": command.state},
        )
        latency = (time.perf_counter() - start) * 1000

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"ESP32 returned status {response.status_code}",
            )

        data = response.json()
        return ToggleResponse(
            led=data.get("led", False),
            success=data.get("success", False),
            hardware_reachable=True,
            latency_ms=round(latency, 2),
        )

    except httpx.ConnectError as e:
        print(f"❌ Erro de conexão no toggle: {e}")
        raise HTTPException(
            status_code=503,
            detail="ESP32 is not reachable. Check network connection.",
        )
    except httpx.TimeoutException:
        print("❌ Timeout no comando toggle")
        raise HTTPException(
            status_code=504,
            detail="ESP32 request timed out.",
        )
    except Exception as e:
        print(f"❌ Erro inesperado no toggle: {e}")
        raise HTTPException(status_code=500, detail=str(e))
