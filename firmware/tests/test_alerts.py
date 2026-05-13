"""
Testa: sistema de alertas — buzzer e motor de vibração
Módulo firmware: alerts.h / alerts.cpp

Lógica:
  silent_mode=False → buzzer toca 3 bipes  (modo normal)
  silent_mode=True  → motor de vibração pulsa (modo silencioso)

O que é verificável via HTTP:
  ✅ Ambos os modos são aceitos sem erro
  ✅ awaiting_confirm=True após qualquer dispense (alerta foi ativado)
  ✅ awaiting_confirm=False após confirm (alerta foi limpo)

O que requer observação física / auditiva:
  👂  Buzzer tocando 3 bipes no modo normal
  👋  Motor de vibração pulsando no modo silencioso
  🔇  Buzzer silencioso quando silent_mode=True
  🔕  Motor parado quando silent_mode=False
"""

import requests
import pytest

TIMEOUT = 5


def test_modo_normal_aceito(base_url, calibrated):
    """silent_mode=False deve ser aceito e retornar sucesso."""
    r = requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": False},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    assert r.json()["success"] is True
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


def test_modo_silencioso_aceito(base_url, calibrated):
    """silent_mode=True deve ser aceito e retornar sucesso."""
    r = requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": True},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    assert r.json()["success"] is True
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


def test_alerta_ativado_apos_dispense(base_url, calibrated):
    """
    Independente do modo (normal ou silencioso),
    awaiting_confirm deve ser True após uma dispensação.
    """
    for silent in [False, True]:
        requests.post(f"{base_url}/calibrate", timeout=TIMEOUT)
        requests.post(
            f"{base_url}/dispense",
            json={"period": "morning", "silent_mode": silent},
            timeout=TIMEOUT,
        )
        r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
        assert r.json()["awaiting_confirm"] is True, (
            f"awaiting_confirm deveria ser True com silent_mode={silent}"
        )
        requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


def test_alerta_limpo_apos_confirm(base_url, calibrated):
    """Após /confirm, todos os alertas devem ser limpos."""
    requests.post(
        f"{base_url}/dispense",
        json={"period": "afternoon", "silent_mode": True},
        timeout=TIMEOUT,
    )
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)

    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.json()["awaiting_confirm"] is False


def test_modo_normal_visual(base_url, calibrated):
    """
    👂  INSPEÇÃO AUDITIVA NECESSÁRIA
    Verifica que o modo normal é aceito. Confirme manualmente:
      - Buzzer deve tocar 3 bipes
      - Motor de vibração deve permanecer parado
    """
    r = requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": False},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    print("\n👂  Verifique: o buzzer deve ter tocado 3 bipes.")
    print("🔕  O motor de vibração deve estar parado.")
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


def test_modo_silencioso_visual(base_url, calibrated):
    """
    👋  INSPEÇÃO TÁTIL NECESSÁRIA
    Verifica que o modo silencioso é aceito. Confirme manualmente:
      - Motor de vibração deve ter pulsado por ~600ms
      - Buzzer deve permanecer silencioso
    """
    r = requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": True},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    print("\n👋  Verifique: o motor de vibração deve ter pulsado.")
    print("🔇  O buzzer deve ter permanecido silencioso.")
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)