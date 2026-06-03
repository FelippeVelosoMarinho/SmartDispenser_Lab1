#ifndef CONFIG_H
#define CONFIG_H

// Necessário antes da detecção de placa: CONFIG_IDF_TARGET_* vem de sdkconfig.h,
// que só entra no escopo após Arduino.h (ou .cpp que incluem WiFi.h etc.).
#include <Arduino.h>

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
#elif defined(ARDUINO_ESP32C3_DEV)
  // Fallback: macro -D da IDE quando sdkconfig ainda não foi exposto
  #include "boards/config_c3_supermini.h"
#elif defined(CONFIG_IDF_TARGET_ESP32)
  #include "boards/config_wroom32.h"
#elif defined(ARDUINO_ESP32_DEV)
  #include "boards/config_wroom32.h"
#else
  #error "Placa não suportada. Defina BOARD_ESP32_C3_SUPERMINI ou BOARD_ESP32_WROOM em config.h, ou selecione ESP32C3 Dev Module / ESP32 Dev Module em Tools > Board."
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
