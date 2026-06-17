#include "alerts.h"
#include "config.h"

static bool awaitingConfirmation = false;
static bool refillMode = false;

// Vibração persistente (modo silencioso)
static bool  sVibratingAlert  = false;
static bool  sVibOn           = false;
static unsigned long sVibLastChange = 0;
static const unsigned long VIB_ON_MS  = 400;
static const unsigned long VIB_OFF_MS = 250;

// ── LEDs de período ───────────────────────────────────────────────────

// Acende apenas o LED correspondente ao período do dia.
// period: "morning" | "afternoon" | "night"
static void showPeriodLed(const String& period) {
  digitalWrite(LED_MORNING,   period == "morning"   ? HIGH : LOW);
  digitalWrite(LED_AFTERNOON, period == "afternoon" ? HIGH : LOW);
  digitalWrite(LED_NIGHT,     period == "night"     ? HIGH : LOW);
}

// ── Buzzer ────────────────────────────────────────────────────────────

static void beep(int times) {
  for (int i = 0; i < times; i++) {
    tone(BUZZER_PIN, BUZZER_FREQ, 300);
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
#if REQUIRE_PATIENT_CONFIRM
  awaitingConfirmation = true;
#else
  // Modo silencioso sempre exige confirmação para parar o motor,
  // mesmo em modo lab (REQUIRE_PATIENT_CONFIRM=0).
  awaitingConfirmation = silentMode;
#endif
  showPeriodLed(period);

  if (silentMode) {
    // Modo silencioso: vibração persistente até o paciente confirmar (via alertsTick)
    Serial.println("[Alerts] modo silencioso — iniciando vibração persistente");
    sVibratingAlert = true;
    sVibOn = true;
    sVibLastChange = millis();
    digitalWrite(VIB_PIN, HIGH);
  } else {
    // Modo normal: 3 bipes
    beep(3);
  }
}

// Apaga todos os LEDs e para qualquer alerta ativo.
// Chamado quando o paciente confirma (botão ou POST /confirm).
void clearAlerts() {
  awaitingConfirmation = false;
  sVibratingAlert = false;
  sVibOn = false;
  digitalWrite(LED_MORNING,   LOW);
  digitalWrite(LED_AFTERNOON, LOW);
  digitalWrite(LED_NIGHT,     LOW);
  digitalWrite(VIB_PIN,       LOW);
  noTone(BUZZER_PIN);
}

// Chamado a cada iteração do loop principal.
// Mantém o padrão de vibração pulsada enquanto aguarda confirmação.
void alertsTick(unsigned long nowMs) {
  if (!sVibratingAlert) return;
  unsigned long elapsed = nowMs - sVibLastChange;
  if (sVibOn && elapsed >= VIB_ON_MS) {
    digitalWrite(VIB_PIN, LOW);
    sVibOn = false;
    sVibLastChange = nowMs;
  } else if (!sVibOn && elapsed >= VIB_OFF_MS) {
    digitalWrite(VIB_PIN, HIGH);
    sVibOn = true;
    sVibLastChange = nowMs;
  }
}

bool isAwaitingConfirmation() {
  return awaitingConfirmation;
}

void setRefillMode(bool enabled) {
  refillMode = enabled;
}

bool isRefillMode() {
  return refillMode;
}