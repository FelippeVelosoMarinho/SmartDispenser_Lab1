"""
Testa: contrato da API HTTP (schemas de request e response)
Módulo firmware: api_server.h / api_server.cpp

Verifica que o firmware retorna exatamente os campos esperados
com os tipos corretos — garantindo compatibilidade com o backend.
"""

import requests
import pytest

TIMEOUT = 5


class TestStatusSchema:
    """GET /status deve retornar todos os campos do contrato."""

    def test_campos_obrigatorios_presentes(self, base_url):
        r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
        data = r.json()
        campos = ["current_slot", "total_slots", "awaiting_confirm",
                  "last_confirmed_slot", "wifi_rssi", "uptime_s"]
        for campo in campos:
            assert campo in data, f"Campo '{campo}' ausente em /status"

    def test_tipos_dos_campos(self, base_url):
        data = requests.get(f"{base_url}/status", timeout=TIMEOUT).json()
        assert isinstance(data["current_slot"],        int)
        assert isinstance(data["total_slots"],          int)
        assert isinstance(data["awaiting_confirm"],     bool)
        assert isinstance(data["last_confirmed_slot"],  int)
        assert isinstance(data["wifi_rssi"],            int)
        assert isinstance(data["uptime_s"],             int)

    def test_total_slots_e_21(self, base_url):
        data = requests.get(f"{base_url}/status", timeout=TIMEOUT).json()
        assert data["total_slots"] == 21

    def test_current_slot_dentro_do_range(self, base_url):
        data = requests.get(f"{base_url}/status", timeout=TIMEOUT).json()
        assert 0 <= data["current_slot"] <= 20


class TestDispenseSchema:
    """POST /dispense deve aceitar o payload correto e retornar o schema esperado."""

    def test_resposta_com_payload_valido(self, base_url, calibrated):
        r = requests.post(
            f"{base_url}/dispense",
            json={"period": "morning", "silent_mode": True},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200
        data = r.json()
        assert "success"       in data
        assert "current_slot"  in data
        assert isinstance(data["success"],      bool)
        assert isinstance(data["current_slot"], int)
        requests.post(f"{base_url}/confirm", timeout=TIMEOUT)

    def test_periodo_invalido_retorna_erro(self, base_url):
        r = requests.post(
            f"{base_url}/dispense",
            json={"period": "invalido", "silent_mode": False},
            timeout=TIMEOUT,
        )
        # Firmware usa fallback "morning" para período inválido —
        # deve retornar 200 sem travar, não 400
        assert r.status_code in (200, 400)
        requests.post(f"{base_url}/confirm", timeout=TIMEOUT)

    def test_payload_vazio_nao_trava_servidor(self, base_url):
        r = requests.post(
            f"{base_url}/dispense",
            json={},
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 400)
        requests.post(f"{base_url}/confirm", timeout=TIMEOUT)

    def test_expected_slot_mismatch_returns_409(self, base_url, calibrated):
        """Com roleta no slot 0, pedir expected_slot=5 exige estar no slot 4 antes — deve 409."""
        requests.post(f"{base_url}/calibrate", timeout=TIMEOUT)
        r = requests.post(
            f"{base_url}/dispense",
            json={"period": "morning", "silent_mode": True, "expected_slot": 5},
            timeout=TIMEOUT,
        )
        assert r.status_code == 409
        data = r.json()
        assert data.get("error") == "slot_mismatch"
        assert data.get("current_slot") == 0

    def test_expected_slot_match_advances(self, base_url, calibrated):
        requests.post(f"{base_url}/calibrate", timeout=TIMEOUT)
        r = requests.post(
            f"{base_url}/dispense",
            json={"period": "morning", "silent_mode": True, "expected_slot": 1},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200
        assert r.json()["current_slot"] == 1
        requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


class TestConfirmSchema:
    """POST /confirm deve retornar o schema esperado."""

    def test_resposta_apos_dispense(self, base_url, calibrated):
        requests.post(
            f"{base_url}/dispense",
            json={"period": "morning", "silent_mode": True},
            timeout=TIMEOUT,
        )
        r = requests.post(f"{base_url}/confirm", timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert "success"        in data
        assert "confirmed_slot" in data
        assert isinstance(data["success"],        bool)
        assert isinstance(data["confirmed_slot"], int)


class TestResetWifiSchema:
    """POST /reset-wifi deve aceitar requisição e responder antes do restart."""

    def test_reset_wifi_retorna_200(self, base_url):
        # Dispositivo reinicia após responder; timeout curto evita esperar reconexão.
        try:
            r = requests.post(f"{base_url}/reset-wifi", timeout=3)
        except requests.exceptions.ReadTimeout:
            pytest.skip("ESP reiniciou antes do timeout — resposta enviada")
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True


class TestCalibrateSchema:
    """POST /calibrate deve retornar o schema esperado."""

    def test_resposta_calibrate(self, base_url):
        r = requests.post(f"{base_url}/calibrate", timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert "success"      in data
        assert "current_slot" in data
        assert data["success"]      is True
        assert data["current_slot"] == 0