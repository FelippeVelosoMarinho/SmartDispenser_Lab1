#include "buttons.h"
#include "config.h"
#include "alerts.h"
#include "carousel.h"
#include "provisioning.h"

static const unsigned long FACTORY_RESET_HOLD_MS = 5000;
static unsigned long factoryResetHoldStart = 0;

static int lastConfirmedSlot = -1; // -1 = nenhuma confirmação pendente

// ── Debounce ──────────────────────────────────────────────────────────
// Detecta apenas a borda de descida (HIGH → LOW) de cada botão,
// com debounce por software. Retorna true apenas no momento em
// que o botão é pressionado, não enquanto é mantido.

struct BtnState {
  bool lastReading;
  bool stablePressed;
  unsigned long lastChange;
};

static const int PINS[3]  = { BTN_VOL_UP, BTN_VOL_DOWN, BTN_CONFIRM };
static BtnState  states[3] = { {true, false, 0},
                                {true, false, 0},
                                {true, false, 0} };

// Retorna true no exato momento em que o botão idx é pressionado.
static bool justPressed(int idx) {
  bool reading = (digitalRead(PINS[idx]) == LOW); // LOW = pressionado (pull-up)

  if (reading != states[idx].lastReading) {
    states[idx].lastChange = millis();
  }
  states[idx].lastReading = reading;

  if ((millis() - states[idx].lastChange) < DEBOUNCE_MS) {
    return false; // ainda dentro do intervalo de debounce
  }

  // Borda de subida estável: botão foi pressionado
  if (reading && !states[idx].stablePressed) {
    states[idx].stablePressed = true;
    return true;
  }

  // Botão solto — reset para próxima detecção
  if (!reading) {
    states[idx].stablePressed = false;
  }

  return false;
}

// ── Public API ────────────────────────────────────────────────────────

void buttonsSetup() {
  pinMode(BTN_VOL_UP,   INPUT_PULLUP);
  pinMode(BTN_VOL_DOWN, INPUT_PULLUP);
  pinMode(BTN_CONFIRM,  INPUT_PULLUP);
}

static void checkFactoryResetHold() {
  bool volUpHeld   = (digitalRead(BTN_VOL_UP) == LOW);
  bool volDownHeld = (digitalRead(BTN_VOL_DOWN) == LOW);

  if (volUpHeld && volDownHeld) {
    if (factoryResetHoldStart == 0) {
      factoryResetHoldStart = millis();
    } else if (millis() - factoryResetHoldStart >= FACTORY_RESET_HOLD_MS) {
      Serial.println("[BTN] Volume + e - por 5s — reset de Wi-Fi.");
      performWifiFactoryReset();
    }
    return;
  }
  factoryResetHoldStart = 0;
}

// Deve ser chamado a cada iteração do loop().
void checkButtons() {
  checkFactoryResetHold();

  if (justPressed(0)) {
    volumeUp();
  }

  if (justPressed(1)) {
    volumeDown();
  }

  if (justPressed(2)) {
    if (isAwaitingConfirmation()) {
      lastConfirmedSlot = getCurrentSlot();
      clearAlerts();
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