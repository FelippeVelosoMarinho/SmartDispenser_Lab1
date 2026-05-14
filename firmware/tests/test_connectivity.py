"""
Testa: conectividade Wi-Fi e servidor HTTP (WiFi + AsyncWebServer)
Módulo firmware: eco-dispenser.ino / config.h
"""

import time
import requests
import pytest

TIMEOUT = 5


def test_esp32_responde(base_url):
    """O servidor HTTP deve estar rodando e responder na porta 80."""
    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.status_code == 200


def test_pagina_diagnostico(base_url):
    """GET / deve retornar uma página HTML de diagnóstico."""
    r = requests.get(f"{base_url}/", timeout=TIMEOUT)
    assert r.status_code == 200
    assert "text/html" in r.headers.get("Content-Type", "")


def test_rota_inexistente_retorna_404(base_url):
    """Rota inexistente não deve travar o servidor."""
    r = requests.get(f"{base_url}/nao-existe", timeout=TIMEOUT)
    assert r.status_code == 404


def test_rssi_dentro_do_esperado(base_url):
    """
    O sinal Wi-Fi (RSSI) deve estar entre -100 dBm e 0 dBm.
    Valores fora desse range indicam leitura inválida.
    """
    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    rssi = r.json()["wifi_rssi"]
    assert -100 <= rssi <= 0, f"RSSI inesperado: {rssi} dBm"


def test_uptime_aumenta_com_tempo(base_url):
    """
    uptime_s deve aumentar entre duas leituras consecutivas,
    confirmando que o firmware está rodando continuamente.
    """
    r1 = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    time.sleep(2)
    r2 = requests.get(f"{base_url}/status", timeout=TIMEOUT)

    uptime1 = r1.json()["uptime_s"]
    uptime2 = r2.json()["uptime_s"]
    assert uptime2 > uptime1, (
        f"uptime não aumentou: {uptime1}s → {uptime2}s"
    )


def test_todos_endpoints_existem(base_url):
    """Todos os endpoints definidos na API devem existir (não retornar 404)."""
    endpoints = [
        ("GET",  "/status"),
        ("GET",  "/"),
        ("POST", "/dispense"),
        ("POST", "/confirm"),
        ("POST", "/calibrate"),
    ]
    for method, path in endpoints:
        if method == "GET":
            r = requests.get(f"{base_url}{path}", timeout=TIMEOUT)
        else:
            r = requests.post(f"{base_url}{path}", json={}, timeout=TIMEOUT)
        assert r.status_code != 404, f"Endpoint {method} {path} retornou 404"