#include "alerts.h"
#include "config.h"

static bool awaitingConfirmation = false;
static int  buzzerLevel = 3; // escala 1–5

// ── LEDs de período ───────────────────────────────────────────────────

// Acende apenas o LED correspondente ao período do dia.
// period: "morning" | "afternoon" | "night"
static void showPeriodLed(const String& period) {
  digitalWrite(LED_MORNING,   period == "morning"   ? HIGH : LOW);
  digitalWrite(LED_AFTERNOON, period == "afternoon" ? HIGH : LOW);
  digitalWrite(LED_NIGHT,     period == "night"     ? HIGH : LOW);
}

// ── Buzzer ────────────────────────────────────────────────────────────

// Mapeia nível 1–5 para frequências distintas de bipe.
static void beep(int times) {
  const int freqs[] = {400, 600, 800, 1000, 1200};
  int freq = freqs[constrain(buzzerLevel - 1, 0, 4)];
  for (int i = 0; i < times; i++) {
    tone(BUZZER_PIN, freq, 300);
    delay(500);
  }
}

// ── Public API ────────────────────────────────────────────────────────

void alertsSetup() {
  pinMode(LED_MORNING,   OUTPUT);
  pinMode(LED_AFTERNOON, OUTPUT);
  pinMode(LED_NIGHT,     OUTPUT);
  pinMode(BUZZER_PIN,    OUTPUT);
  pinMode(VIB_PIN,       OUTPUT);

  digitalWrite(LED_MORNING,   LOW);
  digitalWrite(LED_AFTERNOON, LOW);
  digitalWrite(LED_NIGHT,     LOW);
  digitalWrite(BUZZER_PIN,    LOW);
  digitalWrite(VIB_PIN,       LOW);
}

// Chamado pelo backend via POST /dispense.
// Acende o LED do período e dispara o alerta no modo correto.
void triggerDispenseAlert(bool silentMode, const String& period) {
  awaitingConfirmation = true;
  showPeriodLed(period);

  if (silentMode) {
    // Modo silencioso: vibra no lugar do buzzer
    digitalWrite(VIB_PIN, HIGH);
    delay(600);
    digitalWrite(VIB_PIN, LOW);
  } else {
    // Modo normal: 3 bipes
    beep(3);
  }
}

// Apaga todos os LEDs e para qualquer alerta ativo.
// Chamado quando o paciente confirma (botão ou POST /confirm).
void clearAlerts() {
  awaitingConfirmation = false;
  digitalWrite(LED_MORNING,   LOW);
  digitalWrite(LED_AFTERNOON, LOW);
  digitalWrite(LED_NIGHT,     LOW);
  digitalWrite(VIB_PIN,       LOW);
  noTone(BUZZER_PIN);
}

void volumeUp() {
  buzzerLevel = constrain(buzzerLevel + 1, 1, 5);
  Serial.printf("🔊 Volume: %d/5\n", buzzerLevel);
}

void volumeDown() {
  buzzerLevel = constrain(buzzerLevel - 1, 1, 5);
  Serial.printf("🔉 Volume: %d/5\n", buzzerLevel);
}

bool isAwaitingConfirmation() {
  return awaitingConfirmation;
}