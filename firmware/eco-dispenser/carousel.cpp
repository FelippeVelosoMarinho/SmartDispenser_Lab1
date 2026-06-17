#include "carousel.h"
#include "config.h"
#include <ESP32Servo.h>
#include <Preferences.h>

static Servo servo;
static int   currentSlot = 0;

// ── NVS helpers ───────────────────────────────────────────────────────

static void saveSlot(int slot) {
  Preferences prefs;
  prefs.begin("carousel", false);
  prefs.putInt("slot", slot);
  prefs.end();
}

static int loadSlot() {
  Preferences prefs;
  prefs.begin("carousel", true);
  int slot = prefs.getInt("slot", 0);
  prefs.end();
  return slot;
}

// ── Public API ────────────────────────────────────────────────────────

void carouselSetup() {
#if SERVO_NEEDS_PWM_TIMER
  ESP32PWM::allocateTimer(0);
#endif
  servo.setPeriodHertz(50);
  servo.attach(SERVO_PIN, 500, 2400);
  servo.write(SERVO_REST);
  delay(200);

  currentSlot = loadSlot();
  Serial.printf("🎡 Roleta iniciada no slot %d\n", currentSlot);
}

// Avança a roleta uma posição usando mecanismo de catraca:
// servo vai de repouso → avanço (N impulsos) → repouso, e a catraca física
// converte esse movimento em exatamente 1/21 de volta na roleta.
void advanceCarousel() {
  for (int i = 0; i < SERVO_ADVANCE_WRITES; i++) {
    servo.write(SERVO_ADVANCE);
    delay(SERVO_DELAY_MS);
    servo.write(SERVO_REST);
    delay(SERVO_DELAY_MS);
  }

  currentSlot = (currentSlot + 1) % TOTAL_SLOTS;
  saveSlot(currentSlot);
  Serial.printf("🎡 Avançou para slot %d\n", currentSlot);
}

// Reseta para o slot 0 — usar após recarregar a roleta do zero.
void calibrateCarousel() {
  servo.write(SERVO_REST);
  delay(SERVO_DELAY_MS);
  currentSlot = 0;
  saveSlot(0);
  Serial.println("🎡 Roleta calibrada → slot 0");
}

int getCurrentSlot() {
  return currentSlot;
}

bool isCriticalStock() {
  return currentSlot >= (TOTAL_SLOTS - 3);
}