#ifndef CONFIG_H
#define CONFIG_H

// ── Seleção de placa ──────────────────────────────────────────────────
// Opção A: descomente manualmente a placa em uso:
// #define BOARD_ESP32_WROOM
// #define BOARD_ESP32_C3_SUPERMINI
//
// Opção B: deixe ambos comentados — o roteador detecta automaticamente
// a placa selecionada em Tools > Board na Arduino IDE.

#if defined(BOARD_ESP32_C3_SUPERMINI)
  #include "boards/config_c3_supermini.h"
#elif defined(BOARD_ESP32_WROOM)
  #include "boards/config_wroom32.h"
#elif defined(CONFIG_IDF_TARGET_ESP32C3)
  #include "boards/config_c3_supermini.h"
#elif defined(CONFIG_IDF_TARGET_ESP32)
  #include "boards/config_wroom32.h"
#else
  #error "Placa não suportada. Defina BOARD_ESP32_C3_SUPERMINI ou BOARD_ESP32_WROOM em config.h, ou selecione uma placa ESP32 na IDE."
#endif

// ── Helpers de LED onboard (polaridade varia por placa) ───────────────

#define LED_ONBOARD_OFF() \
  digitalWrite(LED_ONBOARD, LED_ONBOARD_ACTIVE_LOW ? HIGH : LOW)

#define LED_ONBOARD_TOGGLE() \
  digitalWrite(LED_ONBOARD, !digitalRead(LED_ONBOARD))

// ── Configurações comuns (software) ───────────────────────────────────

const int TOTAL_SLOTS = 21;
const int DEBOUNCE_MS = 50;
const int SERVER_PORT = 80;

// ── Backend ───────────────────────────────────────────────────────────
// URL base da API (sem trailing slash). Definida em secrets.h.
extern const char* BACKEND_URL;
const unsigned long HEARTBEAT_INTERVAL_MS = 30UL * 1000UL;

#endif
