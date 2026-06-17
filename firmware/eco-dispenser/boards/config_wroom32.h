#ifndef CONFIG_WROOM32_H
#define CONFIG_WROOM32_H

// ESP32 WROOM / DevKit — mapeamento para placa clássica.
// GPIOs 6-11 são flash interna — não usar para periféricos.

#define BOARD_LABEL "ESP32 WROOM"

// LED onboard: lógica ativa em HIGH (LOW = apagado) — padrão DevKit
#define LED_ONBOARD_ACTIVE_LOW 0

// WROOM não exige ESP32PWM::allocateTimer antes do attach
#define SERVO_NEEDS_PWM_TIMER 0

// ── Servo (roleta) ────────────────────────────────────────────────────
const int SERVO_PIN      = 18;
const int SERVO_REST     = 0;
const int SERVO_ADVANCE  = 198;
const int SERVO_ADVANCE_WRITES = 2;
const int SERVO_DELAY_MS = 400;

// ── LEDs de período do dia ────────────────────────────────────────────
const int LED_MORNING   = 23;
const int LED_AFTERNOON = 4;
const int LED_NIGHT     = 5;

// ── Buzzer ────────────────────────────────────────────────────────────
const int BUZZER_PIN  = 21;
const int BUZZER_FREQ = 1000;

// ── Motor de vibração (via transistor NPN BC547) ──────────────────────
const int VIB_PIN = 22;

// ── Botão de confirmação (INPUT_PULLUP — repouso HIGH, pressionado LOW) ──
// O botão externo será ligado no pino 13.
// Ele funciona com INPUT_PULLUP (liga no pino 13 e a outra ponta no GND).
const int BTN_CONFIRM  = 13;

// ── LED onboard (diagnóstico) ─────────────────────────────────────────
const int LED_ONBOARD = 2;

#endif
