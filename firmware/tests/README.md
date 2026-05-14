# Firmware Tests — ESP32-C3 Eco-Dispenser

Testes HTTP que rodam direto contra o ESP32 pela rede.
Cada arquivo testa um módulo do firmware.

## Estrutura

```
tests/
├── conftest.py          # Setup: IP do ESP32, fixture de calibração
├── test_connectivity.py # Wi-Fi, servidor HTTP, RSSI, uptime
├── test_motor.py        # Servo SG90: avanço de slot, calibração, wrap-around
├── test_leds.py         # LEDs de período: manhã ☀️ / tarde ⛅ / noite 🌙
├── test_alerts.py       # Buzzer (normal) e vibração (modo silencioso)
├── test_buttons.py      # Botões: confirm, volume +/-
└── test_api_schema.py   # Contrato da API: schemas e tipos de todos os endpoints
```

## Pré-requisitos

1. ESP32 ligado, conectado ao Wi-Fi e com o firmware carregado
2. Seu computador na **mesma rede** que o ESP32
3. Python 3.11+

## Instalação

```bash
cd firmware/tests
pip install -r requirements.txt
```

## Como Rodar

```bash
# Todos os testes (ESP32 no IP padrão):
pytest firmware/tests/ -v

# ESP32 em outro IP:
ESP32_IP=192.168.1.50 pytest firmware/tests/ -v

# Um módulo específico:
pytest firmware/tests/test_motor.py -v

# Testes rápidos (sem wrap-around de 21 slots):
pytest firmware/tests/ -v -k "not wrap_around"

# Testes com print (para inspecionar LEDs e som):
pytest firmware/tests/test_leds.py -v -s
pytest firmware/tests/test_alerts.py -v -s
```

## O que cada teste verifica

| Arquivo | Verifica via HTTP | Requer inspeção física |
|---|---|---|
| `test_connectivity.py` | RSSI, uptime, rotas existem | — |
| `test_motor.py` | Slot incrementa, calibra, wrap-around | Servo girando |
| `test_leds.py` | awaiting_confirm muda | LED correto aceso |
| `test_alerts.py` | Estado muda, ambos os modos aceitos | Som / vibração |
| `test_buttons.py` | Efeito do confirm via endpoint | Botões físicos |
| `test_api_schema.py` | Todos os campos e tipos corretos | — |

## Se o ESP32 não for encontrado

```
SKIPPED - ESP32 não encontrado em http://192.168.109.25.
```

Verifique:
1. O ESP32 está ligado?
2. Seu computador está na mesma rede Wi-Fi?
3. O IP está correto? (veja o Serial Monitor do Arduino IDE)
4. Ajuste o IP: `ESP32_IP=x.x.x.x pytest firmware/tests/`