"""
Testa: LEDs de período do dia (indicadores de acessibilidade)
Módulo firmware: alerts.h / alerts.cpp

Cada LED representa um período:
  ☀️  LED_MORNING   (GPIO 3) — manhã
  ⛅  LED_AFTERNOON (GPIO 4) — tarde
  🌙  LED_NIGHT     (GPIO 5) — noite

O que é verificável via HTTP:
  ✅ Estado awaiting_confirm=True após dispense (algum LED acendeu)
  ✅ Estado awaiting_confirm=False após confirm (LED apagou)
  ✅ Todos os períodos válidos são aceitos sem erro

O que requer observação física:
  👁️  O LED correto acendeu para cada período
  👁️  Os outros dois LEDs permanecem apagados
  👁️  O LED apaga após o paciente confirmar
"""

import requests
import pytest

TIMEOUT = 5


@pytest.mark.parametrize("period", ["morning", "afternoon", "night"])
def test_periodo_valido_aceito(base_url, calibrated, period):
    """Todos os três períodos devem ser aceitos com status 200."""
    r = requests.post(
        f"{base_url}/dispense",
        json={"period": period, "silent_mode": True},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"Período '{period}' foi rejeitado"
    assert r.json()["success"] is True

    # Limpa estado para o próximo teste
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


def test_dispense_ativa_awaiting_confirm(base_url, calibrated):
    """
    Após uma dispensação, awaiting_confirm deve ser True,
    indicando que o LED de período foi aceso e aguarda o paciente.
    """
    requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": True},
        timeout=TIMEOUT,
    )
    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.json()["awaiting_confirm"] is True


def test_confirm_desativa_awaiting_confirm(base_url, calibrated):
    """
    Após o paciente confirmar, awaiting_confirm deve ser False
    e o LED de período deve apagar.
    """
    requests.post(
        f"{base_url}/dispense",
        json={"period": "night", "silent_mode": True},
        timeout=TIMEOUT,
    )
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)

    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.json()["awaiting_confirm"] is False


def test_dispense_manhã_visual(base_url, calibrated):
    """
    👁️  INSPEÇÃO VISUAL NECESSÁRIA
    Verifica que a requisição é aceita. Confirme manualmente:
      - LED ☀️  (GPIO 3) aceso
      - LEDs ⛅ e 🌙 apagados
    """
    r = requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": True},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    # Deixa o LED aceso intencionalmente para inspeção
    # Execute: pytest -k "visual" -s   para ver esta mensagem
    print("\n👁️  Verifique: LED ☀️ (GPIO 3) deve estar ACESO agora.")
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


def test_dispense_tarde_visual(base_url, calibrated):
    """
    👁️  INSPEÇÃO VISUAL NECESSÁRIA
    Verifica que a requisição é aceita. Confirme manualmente:
      - LED ⛅ (GPIO 4) aceso
      - LEDs ☀️ e 🌙 apagados
    """
    r = requests.post(
        f"{base_url}/dispense",
        json={"period": "afternoon", "silent_mode": True},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    print("\n👁️  Verifique: LED ⛅ (GPIO 4) deve estar ACESO agora.")
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


def test_dispense_noite_visual(base_url, calibrated):
    """
    👁️  INSPEÇÃO VISUAL NECESSÁRIA
    Verifica que a requisição é aceita. Confirme manualmente:
      - LED 🌙 (GPIO 5) aceso
      - LEDs ☀️ e ⛅ apagados
    """
    r = requests.post(
        f"{base_url}/dispense",
        json={"period": "night", "silent_mode": True},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    print("\n👁️  Verifique: LED 🌙 (GPIO 5) deve estar ACESO agora.")
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)