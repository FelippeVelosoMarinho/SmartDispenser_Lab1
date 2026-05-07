/*
 * Eco-Dispenser Inteligente
 * Firmware: ESP32-C3 SuperMini
 *
 * Arquitetura:
 *   config.h      — pinos e constantes
 *   carousel      — controle da roleta (servo + NVS)
 *   alerts        — LEDs de período, buzzer, vibração
 *   buttons       — botões com debounce
 *   api_server    — endpoints HTTP (AsyncWebServer)
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "secrets.h"
#include "config.h"
#include "carousel.h"
#include "alerts.h"
#include "buttons.h"
#include "api_server.h"

AsyncWebServer server(SERVER_PORT);

void setup() {
  Serial.begin(115200);

  // Aguarda o Serial Monitor abrir (até 5s)
  unsigned long startWait = millis();
  while (!Serial && millis() - startWait < 5000);

  Serial.println("\n🌿 Eco-Dispenser iniciando...");

  // LED onboard: pisca durante conexão Wi-Fi
  pinMode(LED_ONBOARD, OUTPUT);
  digitalWrite(LED_ONBOARD, HIGH); // HIGH = apagado (lógica invertida)

  // Inicializar módulos de hardware
  carouselSetup();
  alertsSetup();
  buttonsSetup();

  // Conectar ao Wi-Fi
  Serial.println("Conectando ao Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    // Pisca LED onboard enquanto conecta (LOW = ligado no SuperMini)
    digitalWrite(LED_ONBOARD, !digitalRead(LED_ONBOARD));
  }

  digitalWrite(LED_ONBOARD, HIGH); // apaga após conectar
  Serial.println("\n✅ Wi-Fi conectado!");
  Serial.print("📍 IP: ");
  Serial.println(WiFi.localIP());

  // Registrar rotas e iniciar servidor HTTP
  setupApiServer(server);
  server.begin();
  Serial.println("🚀 Servidor iniciado!");
}

void loop() {
  checkButtons();
  delay(10);
}