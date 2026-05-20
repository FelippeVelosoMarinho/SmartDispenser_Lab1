"""
Configuração compartilhada dos testes do firmware.
Define fixtures usadas por todos os arquivos de teste.

Como rodar:
    ESP32_IP=192.168.x.x pytest firmware/tests/ -v

Se o ESP32 não estiver acessível, todos os testes são pulados automaticamente.
"""

import os
import pytest
import requests

ESP32_IP = os.getenv("ESP32_IP", "192.168.109.25")
BASE_URL  = f"http://{ESP32_IP}"
TIMEOUT   = 5


def _is_reachable() -> bool:
    try:
        r = requests.get(f"{BASE_URL}/status", timeout=TIMEOUT)
        return r.status_code == 200
    except Exception:
        return False


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session", autouse=True)
def require_esp32():
    """Pula toda a suíte se o ESP32 não estiver acessível na rede."""
    if not _is_reachable():
        pytest.skip(
            f"\n\nESP32 não encontrado em {BASE_URL}.\n"
            "Verifique:\n"
            "  1. O ESP32 está ligado e conectado ao Wi-Fi?\n"
            "  2. Seu computador está na mesma rede?\n"
            "  3. O IP está correto? (ajuste com: ESP32_IP=x.x.x.x pytest)\n"
            "  4. O Serial Monitor mostra o IP correto?\n"
        )


@pytest.fixture
def calibrated(base_url):
    """Reseta a roleta para o slot 0 antes do teste."""
    r = requests.post(f"{base_url}/calibrate", timeout=TIMEOUT)
    assert r.status_code == 200, "Falha ao calibrar antes do teste"
    yield