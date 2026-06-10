#include "buttons.h"
#include "config.h"
#include "alerts.h"
#include "carousel.h"
#include "heartbeat_client.h"

static int lastConfirmedSlot = -1; // -1 = nenhuma confirmação pendente

// ── Debounce ──────────────────────────────────────────────────────────
// Detecta apenas a borda de descida (HIGH → LOW) do botão de confirmação,
// com debounce por software. Retorna true apenas no momento do press.

struct BtnState {
  bool lastReading;
  bool stablePressed;
  unsigned long lastChange;
};

static BtnState confirmState = {true, false, 0};

static bool justPressed() {
  bool reading = (digitalRead(BTN_CONFIRM) == LOW);

  if (reading != confirmState.lastReading) {
    confirmState.lastChange = millis();
  }
  confirmState.lastReading = reading;

  if ((millis() - confirmState.lastChange) < DEBOUNCE_MS) {
    return false;
  }

  if (reading && !confirmState.stablePressed) {
    confirmState.stablePressed = true;
    return true;
  }

  if (!reading) {
    confirmState.stablePressed = false;
  }

  return false;
}

// ── Public API ────────────────────────────────────────────────────────

void buttonsSetup() {
  pinMode(BTN_CONFIRM, INPUT_PULLUP);
}

void checkButtons() {
  if (justPressed()) {
    if (isAwaitingConfirmation()) {
      lastConfirmedSlot = getCurrentSlot();
      clearAlerts();
      requestEarlyHeartbeat();
      Serial.printf("✅ Confirmado pelo paciente — slot %d\n", lastConfirmedSlot);
    }
  }
}

int getLastConfirmedSlot() {
  return lastConfirmedSlot;
}

void resetLastConfirmedSlot() {
  lastConfirmedSlot = -1;
}
