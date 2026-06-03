# Plano de Verificação: Suporte Multi-placa (ESP32-C3 vs ESP32 WROOM)

## 1. Objetivo

Confirmar que o roteador de placas implementado compila e funciona corretamente na **sua placa (ESP32-C3 SuperMini)** e na **placa do colega (ESP32 WROOM/DevKit)**, documentando qual LED/periférico está em qual GPIO em cada variante.

---

## 2. Estado Atual da Implementação

A arquitetura descrita em `multi-board-support-planner.md` **já foi implementada**:

```
firmware/eco-dispenser/
├── config.h                    ← roteador automático
└── boards/
    ├── config_c3_supermini.h   ← sua placa
    └── config_wroom32.h        ← placa WROOM
```

### 2.1 Seleção automática de placa

Em `config.h`, a placa é escolhida por:

1. `#define BOARD_ESP32_C3_SUPERMINI` ou `BOARD_ESP32_WROOM` (manual), **ou**
2. Detecção pela IDE: `CONFIG_IDF_TARGET_ESP32C3` → C3, `CONFIG_IDF_TARGET_ESP32` → WROOM.

Ao boot, o Serial exibe: `Eco-Dispenser iniciando (ESP32-C3 SuperMini)...` ou `(ESP32 WROOM)...`.

### 2.2 Mapa de pinos por placa

| Periférico | ESP32-C3 SuperMini | ESP32 WROOM / DevKit | Observação |
|------------|-------------------|----------------------|------------|
| **Servo (roleta)** | GPIO **2** | GPIO **18** | C3 exige `ESP32PWM::allocateTimer(0)` |
| **LED Manhã** ☀️ | GPIO **3** | GPIO **12** | Acende em `POST /dispense` period=morning |
| **LED Tarde** ⛅ | GPIO **4** | GPIO **13** | period=afternoon |
| **LED Noite** 🌙 | GPIO **5** | GPIO **14** | period=night |
| **Buzzer** | GPIO **21** | GPIO **25** | 3 bipes no modo normal |
| **Vibração** | GPIO **10** | GPIO **32** | Modo silencioso |
| **Botão Vol+** | GPIO **6** | GPIO **16** | INPUT_PULLUP |
| **Botão Vol−** | GPIO **7** | GPIO **17** | INPUT_PULLUP |
| **Botão Confirmar** | GPIO **0** | GPIO **0** | BOOT — cuidado ao pressionar durante upload |
| **LED onboard** | GPIO **8** | GPIO **2** | Diagnóstico Wi-Fi / boot |

### 2.3 Diferenças de comportamento de hardware

| Comportamento | C3 SuperMini | WROOM |
|---------------|--------------|-------|
| LED onboard polaridade | **Active LOW** (`LED_ONBOARD_ACTIVE_LOW=1`) | **Active HIGH** |
| Servo PWM timer | `SERVO_NEEDS_PWM_TIMER=1` | `SERVO_NEEDS_PWM_TIMER=0` |
| GPIOs proibidos | 18–19 (USB), evitar 6–11 | 6–11 (flash interna) |
| Macros helpers | `LED_ONBOARD_OFF()`, `LED_ONBOARD_TOGGLE()` | idem |

Código condicional em `carousel.cpp`:

```cpp
#if SERVO_NEEDS_PWM_TIMER
  ESP32PWM::allocateTimer(0);
#endif
```

---

## 3. Perguntas a Responder na Verificação

| # | Pergunta | Como validar |
|---|----------|--------------|
| 1 | Compila para C3 sem editar pinos? | Board = `ESP32C3 Dev Module` → build OK |
| 2 | Compila para WROOM sem editar pinos? | Board = `ESP32 Dev Module` → build OK |
| 3 | `BOARD_LABEL` correto no Serial? | Mensagem de boot |
| 4 | LED onboard pisca na conexão Wi-Fi? | Toggle durante retry; apaga ao conectar |
| 5 | Servo avança 1 slot por dispense? | `test_motor.py` ou POST `/dispense` |
| 6 | LED de período correto acende? | `test_leds.py` + inspeção visual |
| 7 | Buzzer e vibração nos modos certos? | `test_alerts.py` |
| 8 | Botão confirmar limpa alertas? | `test_buttons.py` |
| 9 | Pinos do WROOM batem com fiação física do colega? | Checklist físico (pode precisar ajuste em `config_wroom32.h`) |

---

## 4. Plano de Testes

### Fase A — Compilação cruzada (sem hardware)

Para **cada placa**, na Arduino IDE:

- [ ] **A1.** Selecionar board correta em `Tools > Board`.
- [ ] **A2.** Compilar (`Verify`) — zero erros.
- [ ] **A3.** Confirmar no output que `BOARD_LABEL` e includes corretos (grep no `.o` ou inspecionar Serial após flash).
- [ ] **A4.** Teste de regressão: forçar `#define BOARD_ESP32_WROOM` em `config.h` com board C3 selecionada → deve compilar mas **pinos errados** (documentar como anti-padrão).

### Fase B — ESP32-C3 SuperMini (sua placa)

Pré-requisitos: firmware flashado, ESP na rede, IP anotado.

- [ ] **B1.** Serial: `Eco-Dispenser iniciando (ESP32-C3 SuperMini)...`
- [ ] **B2.** Rodar suíte HTTP:
  ```bash
  cd firmware/tests
  pip install -r requirements.txt
  ESP32_IP=<seu_ip> pytest -v
  ```
- [ ] **B3.** Checklist físico manual:

  | Teste | Comando | Esperado no hardware |
  |-------|---------|---------------------|
  | Manhã | `curl -X POST http://<IP>/dispense -d '{"period":"morning","silent_mode":false}'` | LED GPIO **3** aceso, buzzer |
  | Tarde | period=afternoon | LED GPIO **4** |
  | Noite | period=night | LED GPIO **5** |
  | Silencioso | silent_mode=true | vibração GPIO **10**, sem buzzer |
  | Calibrar | POST /calibrate | slot 0, LEDs apagados |

- [ ] **B4.** Confirmar LED onboard (GPIO 8) apaga após Wi-Fi conectado.

### Fase C — ESP32 WROOM (placa do colega)

Repetir Fase B com board `ESP32 Dev Module` e IP do colega.

- [ ] **C1.** Serial: `(ESP32 WROOM)...`
- [ ] **C2.** `ESP32_IP=<ip_colega> pytest -v`
- [ ] **C3.** Validar GPIOs **12/13/14** (LEDs), **18** (servo), **25** (buzzer), **32** (vib).
- [ ] **C4.** Se algum periférico não responder: **ajustar** `boards/config_wroom32.h` (comentário no arquivo já avisa) e re-flash.

### Fase D — Comparativo entre placas

- [ ] **D1.** Preencher matriz de resultados (pass/fail) para C3 vs WROOM.
- [ ] **D2.** Documentar divergências de fiação física vs `config_wroom32.h`.
- [ ] **D3.** Atualizar `firmware/README.md` se pinos do colega forem diferentes do default.

---

## 5. Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| Pinos WROOM são **placeholder** do colega | Validar fiação antes de pytest |
| GPIO 0 (BOOT) como confirmar | Evitar pressionar durante upload; considerar outro pino no WROOM |
| Bibliotecas Async erradas | Usar **ESP Async WebServer** + **Async TCP** (Core 3.x) — ver `DEPENDENCIES.md` |
| C3 crash TCP pós-Wi-Fi | Heartbeat com `setReuse(false)` já aplicado; não stressar rede |

---

## 6. Critérios de Conclusão

- [ ] Build OK nas duas boards sem editar `config.h` (modo automático).
- [ ] `pytest firmware/tests/` passa (ou skips justificados) em **ambas** as placas.
- [ ] Tabela de pinos validada fisicamente e commitada se houver correção no WROOM.
- [ ] `multi-board-support-planner.md` marcado como implementado (checkboxes da seção 6).

---

## 7. Referências

- `firmware/eco-dispenser/config.h`
- `firmware/eco-dispenser/boards/config_c3_supermini.h`
- `firmware/eco-dispenser/boards/config_wroom32.h`
- `firmware/README.md`
- `firmware/tests/README.md`
- `claude-docs/multi-board-support-planner.md` (plano original)
