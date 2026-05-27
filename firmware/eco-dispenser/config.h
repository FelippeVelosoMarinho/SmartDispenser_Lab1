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
// GPIOs 6-11 são flash interna no WROOM — usar pinos seguros para testes
const int BUZZER_PIN  = 21;
const int BUZZER_FREQ = 1000; // Hz — frequência base do bipe

// ── Motor de vibração (via transistor NPN BC547) ──────────────────────
const int VIB_PIN = 22;

// ── Botões (INPUT_PULLUP — repouso HIGH, pressionado LOW) ─────────────
const int BTN_VOL_UP   = 12;
const int BTN_VOL_DOWN = 13;
const int BTN_CONFIRM  = 0;
const int DEBOUNCE_MS  = 50;

// ── LED onboard (diagnóstico) ─────────────────────────────────────────
const int LED_ONBOARD = 2;

// ── Servidor HTTP ─────────────────────────────────────────────────────
const int SERVER_PORT = 80;

// ── Backend ───────────────────────────────────────────────────────────
// URL base da API (sem trailing slash). Definida em secrets.h.
// Exemplo: "http://192.168.1.100:8000"
// Deixar vazio ("") para desabilitar o heartbeat.
extern const char* BACKEND_URL;

#endif