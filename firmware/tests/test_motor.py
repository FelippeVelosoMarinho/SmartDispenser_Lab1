"""
Testa: controle do servo SG90 e lógica da roleta
Módulo firmware: carousel.h / carousel.cpp

O que é verificável via HTTP:
  ✅ Slot avança 1 posição a cada /dispense
  ✅ Slot reseta para 0 com /calibrate
  ✅ Slot persiste corretamente (tracking interno)
  ✅ Wrap-around correto ao passar do slot 20

O que requer observação física:
  👁️  O servo efetivamente girando
  👁️  O ângulo de avanço correto (~17,14°)
  👁️  O mecanismo de catraca destravando o compartimento
"""

import requests
import pytest

TIMEOUT  = 5
DISPENSE_PAYLOAD = {"period": "morning", "silent_mode": True}
# silent_mode=True para não tocar o buzzer durante os testes


def test_calibrate_reseta_para_zero(base_url):
    """POST /calibrate deve retornar current_slot == 0."""
    r = requests.post(f"{base_url}/calibrate", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["current_slot"] == 0


def test_dispense_avanca_um_slot(base_url, calibrated):
    """Após calibrar (slot 0), um /dispense deve levar ao slot 1."""
    r = requests.post(
        f"{base_url}/dispense",
        json=DISPENSE_PAYLOAD,
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["current_slot"] == 1


def test_dispenses_acumulam_corretamente(base_url, calibrated):
    """5 dispensações consecutivas devem levar ao slot 5."""
    for _ in range(5):
        requests.post(
            f"{base_url}/dispense",
            json=DISPENSE_PAYLOAD,
            timeout=TIMEOUT,
        )
    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.json()["current_slot"] == 5


def test_status_reflete_slot_apos_dispense(base_url, calibrated):
    """GET /status deve refletir o mesmo slot retornado pelo /dispense."""
    dispense_r = requests.post(
        f"{base_url}/dispense",
        json=DISPENSE_PAYLOAD,
        timeout=TIMEOUT,
    )
    slot_from_dispense = dispense_r.json()["current_slot"]

    status_r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    slot_from_status = status_r.json()["current_slot"]

    assert slot_from_dispense == slot_from_status


def test_total_slots_e_sempre_21(base_url):
    """A roleta sempre tem 21 slots — valor não deve mudar."""
    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.json()["total_slots"] == 21


def test_wrap_around_no_slot_21(base_url, calibrated):
    """
    Após 21 dispensações a partir do slot 0, a roleta deve voltar ao slot 0.
    ⚠️  Este teste leva ~30s pois cada dispense espera o servo completar.
    """
    for _ in range(21):
        requests.post(
            f"{base_url}/dispense",
            json=DISPENSE_PAYLOAD,
            timeout=TIMEOUT,
        )
    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.json()["current_slot"] == 0, (
        "Após 21 dispensações, a roleta deveria estar no slot 0 (wrap-around)"
    )


def test_calibrate_apos_dispensas_parciais(base_url, calibrated):
    """Calibrar no meio de uma sequência deve resetar para 0."""
    for _ in range(7):
        requests.post(
            f"{base_url}/dispense",
            json=DISPENSE_PAYLOAD,
            timeout=TIMEOUT,
        )

    r = requests.post(f"{base_url}/calibrate", timeout=TIMEOUT)
    assert r.json()["current_slot"] == 0

    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.json()["current_slot"] == 0