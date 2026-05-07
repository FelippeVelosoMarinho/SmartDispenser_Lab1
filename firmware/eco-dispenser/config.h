#ifndef CONFIG_H
#define CONFIG_H

// ── Servo (roleta) ────────────────────────────────────────────────────
const int   SERVO_PIN      = 2;
const int   TOTAL_SLOTS    = 21;
const int   SERVO_REST     = 0;   // graus — posição de repouso
const int   SERVO_ADVANCE  = 90;  // graus — posição de avanço (ajustar com o hardware real)
const int   SERVO_DELAY_MS = 400; // ms aguardando o servo alcançar a posição

// ── LEDs de período do dia ────────────────────────────────────────────
const int LED_MORNING   = 3;  // ☀️  Sol        — manhã
const int LED_AFTERNOON = 4;  // ⛅  Sol + nuvem — tarde
const int LED_NIGHT     = 5;  // 🌙  Lua         — noite

// ── Buzzer ────────────────────────────────────────────────────────────
const int BUZZER_PIN  = 6;
const int BUZZER_FREQ = 1000; // Hz — frequência base do bipe

// ── Motor de vibração (via transistor NPN BC547) ──────────────────────
const int VIB_PIN = 7;

// ── Botões (INPUT_PULLUP — repouso HIGH, pressionado LOW) ─────────────
const int BTN_VOL_UP   = 9;
const int BTN_VOL_DOWN = 10;
const int BTN_CONFIRM  = 0;
const int DEBOUNCE_MS  = 50;

// ── LED onboard (diagnóstico) ─────────────────────────────────────────
// Lógica invertida no SuperMini: LOW = ligado, HIGH = desligado
const int LED_ONBOARD = 8;

// ── Servidor HTTP ─────────────────────────────────────────────────────
const int SERVER_PORT = 80;

#endif