"""HTTP proxy helpers for ESP32 firmware endpoints."""

from typing import Any

import httpx

from app.core.config import REQUEST_TIMEOUT

_ESP_TIMEOUT = REQUEST_TIMEOUT


async def get_hardware_status(ip: str) -> dict[str, Any] | None:
    url = f"http://{ip}/status"
    try:
        async with httpx.AsyncClient(timeout=_ESP_TIMEOUT) as client:
            resp = await client.get(url)
        if resp.status_code == 200:
            return resp.json()
        return None
    except (httpx.ConnectError, httpx.TimeoutException):
        return None


async def post_calibrate(ip: str) -> tuple[bool, dict[str, Any] | None]:
    url = f"http://{ip}/calibrate"
    try:
        async with httpx.AsyncClient(timeout=_ESP_TIMEOUT) as client:
            resp = await client.post(url)
        if resp.status_code == 200:
            try:
                return True, resp.json()
            except Exception:
                return True, {}
        return False, None
    except (httpx.ConnectError, httpx.TimeoutException):
        return False, None


async def post_confirm(ip: str) -> bool:
    url = f"http://{ip}/confirm"
    try:
        async with httpx.AsyncClient(timeout=_ESP_TIMEOUT) as client:
            resp = await client.post(url)
        return resp.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        return False

async def post_demo(ip: str) -> tuple[bool, dict[str, Any] | None]:
    url = f"http://{ip}/demo"
    try:
        async with httpx.AsyncClient(timeout=_ESP_TIMEOUT) as client:
            resp = await client.post(url)
        if resp.status_code == 200:
            try:
                return True, resp.json()
            except Exception:
                return True, {}
        return False, None
    except (httpx.ConnectError, httpx.TimeoutException):
        return False, None

async def get_demo_status(ip: str) -> dict[str, Any] | None:
    url = f"http://{ip}/demo-status"
    try:
        async with httpx.AsyncClient(timeout=_ESP_TIMEOUT) as client:
            resp = await client.get(url)
        if resp.status_code == 200:
            return resp.json()
        return None
    except (httpx.ConnectError, httpx.TimeoutException):
        return None

async def post_demo_stop(ip: str) -> tuple[bool, dict[str, Any] | None]:
    url = f"http://{ip}/demo-stop"
    try:
        async with httpx.AsyncClient(timeout=_ESP_TIMEOUT) as client:
            resp = await client.post(url)
        if resp.status_code == 200:
            try:
                return True, resp.json()
            except Exception:
                return True, {}
        return False, None
    except (httpx.ConnectError, httpx.TimeoutException):
        return False, None
