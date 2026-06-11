/*
 * hardware_test.ino — Teste de todos os periféricos do SmartDispenser
 *
 * Como rodar:
 *   1. Abra esta pasta na Arduino IDE (File > Open > hardware_test.ino)
 *   2. Selecione: Tools > Board > ESP32C3 Dev Module
 *   3. Flash na placa normalmente
 *   4. Abra Serial Monitor em 115200 baud
 *   5. Acompanhe os testes no monitor; cada etapa aguarda 2s
 *
 * ATENÇÃO — conflitos de pino identificados no config atual:
 *   - SERVO_PIN (8) == LED_ONBOARD (8): o LED onboard vai interferir no servo!
 *     Corrija config_c3_supermini.h antes de usar o servo no firmware principal.
 */

#include <Arduino.h>
#include <ESP32Servo.h>

// ── Pinos (espelho do config_c3_supermini.h atual) ────────────────────
// Se mudar o config, atualize aqui também.
#define PIN_LED_ONBOARD   8   // LED azul onboard (LOW = aceso)
#define PIN_LED_MORNING   7
#define PIN_LED_AFTERNOON 1
#define PIN_LED_NIGHT     0
#define PIN_BUZZER        2
#define PIN_VIB           6
#define PIN_SERVO         10   // ⚠️ CONFLITO com LED_ONBOARD!
#define PIN_BTN_CONFIRM   3

// ── Helpers ───────────────────────────────────────────────────────────
static Servo testServo;

static void header(const char* name) {
  Serial.println();
  Serial.println("════════════════════════════════");
  Serial.printf ("  TESTE: %s\n", name);
  Serial.println("════════════════════════════════");
}

static void ok()   { Serial.println("  → OK"); delay(300); }
static void pause(int ms) { delay(ms); }

// ── Testes ────────────────────────────────────────────────────────────

void testLedOnboard() {
  header("LED ONBOARD (GPIO 8)");
  Serial.println("  Piscando 5x...");
  for (int i = 0; i < 5; i++) {
    digitalWrite(PIN_LED_ONBOARD, LOW);   // acende (lógica invertida)
    delay(200);
    digitalWrite(PIN_LED_ONBOARD, HIGH);  // apaga
    delay(200);
  }
  ok();
}

void testLedsManha() {
  header("LED MORNING (GPIO 10)");
  Serial.println("  Acendendo 1s...");
  digitalWrite(PIN_LED_MORNING, HIGH);
  delay(1000);
  digitalWrite(PIN_LED_MORNING, LOW);
  ok();
}

void testLedsTarde() {
  header("LED AFTERNOON (GPIO 1)");
  Serial.println("  Acendendo 1s...");
  digitalWrite(PIN_LED_AFTERNOON, HIGH);
  delay(1000);
  digitalWrite(PIN_LED_AFTERNOON, LOW);
  ok();
}

void testLedsNoite() {
  header("LED NIGHT (GPIO 0)");
  Serial.println("  Acendendo 1s...");
  digitalWrite(PIN_LED_NIGHT, HIGH);
  delay(1000);
  digitalWrite(PIN_LED_NIGHT, LOW);
  ok();
}

void testTodoLeds() {
  header("TODOS OS LEDs DE PERÍODO");
  Serial.println("  Todos ON por 1s...");
  digitalWrite(PIN_LED_MORNING,   HIGH);
  digitalWrite(PIN_LED_AFTERNOON, HIGH);
  digitalWrite(PIN_LED_NIGHT,     HIGH);
  delay(1000);
  digitalWrite(PIN_LED_MORNING,   LOW);
  digitalWrite(PIN_LED_AFTERNOON, LOW);
  digitalWrite(PIN_LED_NIGHT,     LOW);
  ok();
}

void testBuzzer() {
  header("BUZZER (GPIO 2)");
  Serial.println("  3 bipes...");
  for (int i = 0; i < 3; i++) {
    tone(PIN_BUZZER, 1000);
    delay(300);
    noTone(PIN_BUZZER);
    delay(200);
  }
  ok();
}

void testMotorVibracao() {
  header("MOTOR DE VIBRAÇÃO");
  Serial.println("  Pulsando 5x (400ms ON / 250ms OFF)...");
  for (int i = 0; i < 5; i++) {
    digitalWrite(PIN_VIB, HIGH);
    delay(400);
    digitalWrite(PIN_VIB, LOW);
    delay(250);
  }
  ok();
}

void testServoMotor() {
  header("SERVO / ROLETA (GPIO 8)");
  Serial.println("  ⚠️  CONFLITO: GPIO 8 = LED onboard. Resultado pode ser incorreto.");
  Serial.println("  Avançando para 90° e voltando para 0°...");

  testServo.attach(PIN_SERVO);
  delay(100);

  testServo.write(90);
  delay(600);
  testServo.write(0);
  delay(600);

  testServo.detach();
  ok();
}

// ── Setup / Loop ──────────────────────────────────────────────────────

static bool btnLastState = true;
static int  btnPressCount = 0;

void setup() {
  Serial.begin(115200);
  unsigned long t = millis();
  while (!Serial && millis() - t < 5000);
  delay(500);

  // Configura pinos
  pinMode(PIN_LED_ONBOARD,   OUTPUT);
  pinMode(PIN_LED_MORNING,   OUTPUT);
  pinMode(PIN_LED_AFTERNOON, OUTPUT);
  pinMode(PIN_LED_NIGHT,     OUTPUT);
  pinMode(PIN_BUZZER,        OUTPUT);
  pinMode(PIN_VIB,           OUTPUT);
  pinMode(PIN_BTN_CONFIRM,   INPUT_PULLUP);

  // Garante tudo apagado
  digitalWrite(PIN_LED_ONBOARD,   HIGH);
  digitalWrite(PIN_LED_MORNING,   LOW);
  digitalWrite(PIN_LED_AFTERNOON, LOW);
  digitalWrite(PIN_LED_NIGHT,     LOW);
  digitalWrite(PIN_BUZZER,        LOW);
  digitalWrite(PIN_VIB,           LOW);

  Serial.println("\n\n🔧 SmartDispenser — Teste de Hardware");
  Serial.println("Iniciando em 2s...");
  delay(2000);

  testLedOnboard();       pause(500);
  testLedsManha();        pause(500);
  testLedsTarde();        pause(500);
  testLedsNoite();        pause(500);
  testTodoLeds();         pause(500);
  testBuzzer();           pause(500);
  testMotorVibracao();    pause(500);
  testServoMotor();       pause(500);

  Serial.println();
  Serial.println("════════════════════════════════");
  Serial.println("  TESTES DE PERIFÉRICOS CONCLUÍDOS");
  Serial.println("  Monitorando botão CONFIRM em loop...");
  Serial.println("  Pressione quantas vezes quiser.");
  Serial.println("════════════════════════════════");
}

void loop() {
  bool reading = (digitalRead(PIN_BTN_CONFIRM) == LOW);

  if (reading && !btnLastState) {
    delay(50); // debounce
    if (digitalRead(PIN_BTN_CONFIRM) == LOW) {
      btnPressCount++;
      Serial.printf("✅ Botão CONFIRM pressionado! (total: %d)\n", btnPressCount);
    }
  }

  btnLastState = reading;
  delay(10);
}
