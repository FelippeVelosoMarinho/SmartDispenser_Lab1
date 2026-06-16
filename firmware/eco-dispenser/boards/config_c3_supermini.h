#ifndef CONFIG_C3_SUPERMINI_H
#define CONFIG_C3_SUPERMINI_H

// ESP32-C3 SuperMini — mapeamento atual do hardware de referência.
// GPIOs 18-19 reservados para USB; evitar 6-11 se possível em variantes com flash interna.

#define BOARD_LABEL "ESP32-C3 SuperMini"

// LED onboard: lógica invertida (LOW = aceso, HIGH = apagado)
#define LED_ONBOARD_ACTIVE_LOW 1

// ESP32Servo exige alocação explícita de timer no C3
#define SERVO_NEEDS_PWM_TIMER 1

// ── Servo (roleta) ────────────────────────────────────────────────────
const int SERVO_PIN      = 10;
const int SERVO_REST     = 0;
const int SERVO_ADVANCE  = 198;
const int SERVO_ADVANCE_WRITES = 2;
const int SERVO_DELAY_MS = 400;

// ── LEDs de período do dia ────────────────────────────────────────────
const int LED_MORNING   = 7;
const int LED_AFTERNOON = 1;
const int LED_NIGHT     = 0;

// ── Buzzer ────────────────────────────────────────────────────────────
const int BUZZER_PIN  = 2;
const int BUZZER_FREQ = 1000;

// ── Motor de vibração (via transistor NPN BC547) ──────────────────────
const int VIB_PIN = 6;

// ── Botão de confirmação (INPUT_PULLUP — repouso HIGH, pressionado LOW) ──
const int BTN_CONFIRM  = 3;  // botão BOOT onboard

// ── LED onboard (diagnóstico) ─────────────────────────────────────────
const int LED_ONBOARD = 8;

#endif
