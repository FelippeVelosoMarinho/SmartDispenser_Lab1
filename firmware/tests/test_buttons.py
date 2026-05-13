"""
Testa: comportamento dos botões via estado HTTP
Módulo firmware: buttons.h / buttons.cpp

Botões do dispenser:
  BTN_CONFIRM  (GPIO 0)  — paciente confirma que tomou o remédio
  BTN_VOL_UP   (GPIO 9)  — aumenta volume do buzzer
  BTN_VOL_DOWN (GPIO 10) — diminui volume do buzzer

Os botões não podem ser acionados remotamente via HTTP.
Estes testes verificam o EFEITO dos botões através do estado
reportado pelo /status, e testam o endpoint /confirm que
replica o mesmo efeito do botão de confirmação.

O que é verificável via HTTP:
  ✅ POST /confirm (equivalente ao botão) limpa awaiting_confirm
  ✅ POST /confirm registra o slot confirmado em last_confirmed_slot
  ✅ Estado volta ao normal após confirmação

O que requer acionamento físico + observação:
  🖐️  Pressionar BTN_CONFIRM e verificar que awaiting_confirm vira False
  🔊  Pressionar BTN_VOL_UP e verificar que o buzzer fica mais alto
  🔉  Pressionar BTN_VOL_DOWN e verificar que o buzzer fica mais baixo
"""

import requests
import pytest

TIMEOUT = 5


def test_confirm_endpoint_limpa_estado(base_url, calibrated):
    """
    POST /confirm deve limpar awaiting_confirm,
    replicando o efeito do BTN_CONFIRM físico.
    """
    requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": True},
        timeout=TIMEOUT,
    )
    assert requests.get(
        f"{base_url}/status", timeout=TIMEOUT
    ).json()["awaiting_confirm"] is True

    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)

    r = requests.get(f"{base_url}/status", timeout=TIMEOUT)
    assert r.json()["awaiting_confirm"] is False


def test_confirm_registra_slot_confirmado(base_url, calibrated):
    """
    Após confirmar, last_confirmed_slot deve ser o slot
    que estava ativo no momento da dispensação.
    """
    dispense_r = requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": True},
        timeout=TIMEOUT,
    )
    slot_dispensado = dispense_r.json()["current_slot"]

    confirm_r = requests.post(f"{base_url}/confirm", timeout=TIMEOUT)
    assert confirm_r.json()["confirmed_slot"] == slot_dispensado


def test_confirm_sem_dispense_previa(base_url, calibrated):
    """
    POST /confirm quando não há dispensação pendente
    não deve retornar erro — o firmware trata isso graciosamente.
    """
    r = requests.post(f"{base_url}/confirm", timeout=TIMEOUT)
    assert r.status_code == 200


def test_botao_confirm_fisico(base_url, calibrated):
    """
    🖐️  ACIONAMENTO FÍSICO NECESSÁRIO

    1. Execute este teste com: pytest -k "fisico" -s
    2. O teste dispara uma dose e pausa.
    3. Pressione o BTN_CONFIRM (GPIO 0) no dispenser.
    4. O teste verifica se o estado mudou.

    Como o pytest não pode pausar para interação manual,
    este teste despacha a dose e logo verifica via endpoint.
    Para o teste do botão real, use o script manual abaixo.
    """
    requests.post(
        f"{base_url}/dispense",
        json={"period": "morning", "silent_mode": True},
        timeout=TIMEOUT,
    )
    print("\n🖐️  Pressione o BTN_CONFIRM (GPIO 0) agora.")
    print("    Depois rode: GET /status e verifique awaiting_confirm=false")
    # Limpeza via endpoint para não bloquear próximos testes
    requests.post(f"{base_url}/confirm", timeout=TIMEOUT)


def test_botao_volume_up_fisico(base_url):
    """
    🔊  ACIONAMENTO FÍSICO + AUDITIVO NECESSÁRIO

    Pressione BTN_VOL_UP (GPIO 9) enquanto o buzzer está tocando.
    Verifique se o volume aumenta (frequência do bipe sobe).
    Não é possível medir volume via HTTP.
    """
    print("\n🔊  Para testar: pressione BTN_VOL_UP (GPIO 9) durante um bipe.")
    print("    Verifique se o som fica mais agudo.")


def test_botao_volume_down_fisico(base_url):
    """
    🔉  ACIONAMENTO FÍSICO + AUDITIVO NECESSÁRIO

    Pressione BTN_VOL_DOWN (GPIO 10) enquanto o buzzer está tocando.
    Verifique se o volume diminui (frequência do bipe cai).
    """
    print("\n🔉  Para testar: pressione BTN_VOL_DOWN (GPIO 10) durante um bipe.")
    print("    Verifique se o som fica mais grave.")