/*
 * Eco-Dispenser Inteligente — MVP POC
 * Firmware: ESP32-C3 Async Web Server
 * 
 * ATUALIZAÇÃO: Removido dependência da ArduinoJson para evitar conflitos de versão.
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "secrets.h"

// ─── Wi-Fi Credentials ──────────────────────────────────────────────
// const char* ssid     = WIFI_SSID;
// const char* password = WIFI_PASSWORD;
const char* ssid = "me usa me abusa";
const char* password = "ABCDEFGH";

// ─── Hardware Config ─────────────────────────────────────────────────
const int LED_PIN = 8;  // GPIO 8 — LED onboard do ESP32-C3 SuperMini
bool ledState = false;

AsyncWebServer server(80);

// ─── Utility: Build LED status JSON (Manual) ────────────────────────
String buildStatusJson() {
  return "{\"led\":" + String(ledState ? "true" : "false") + "}";
}

// ─── Web Handlers ───────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  
  // Esperar o Serial Monitor abrir por até 5 segundos
  unsigned long startWait = millis();
  while (!Serial && millis() - startWait < 5000);
  
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, ledState ? LOW : HIGH); // LED Onboard é invertido no C3 SuperMini

  // 1. Conectar Wi-Fi
  Serial.println("\nConectando ao Wi-Fi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ Wi-Fi conectado!");
  Serial.print("📍 IP: ");
  Serial.println(WiFi.localIP());

  // 2. Endpoints API

  // GET /status
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "application/json", buildStatusJson());
  });

  // POST /led (Manual Parsing)
  server.on("/led", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
    [](AsyncWebServerRequest *request, uint8_t* data, size_t len, size_t index, size_t total) {
      String body = "";
      for (size_t i = 0; i < len; i++) {
        body += (char)data[i];
      }

      Serial.print("Body recebido: ");
      Serial.println(body);

      bool found = false;
      if (body.indexOf("\"on\"") > 0) {
        ledState = true;
        found = true;
      } else if (body.indexOf("\"off\"") > 0) {
        ledState = false;
        found = true;
      }

      if (found) {
        digitalWrite(LED_PIN, ledState ? LOW : HIGH); // LOW liga o LED no C3 SuperMini
        request->send(200, "application/json", "{\"led\":" + String(ledState ? "true" : "false") + ",\"success\":true}");
      } else {
        request->send(400, "application/json", "{\"error\":\"Invalid state\"}");
      }
    }
  );

  // Fallback /
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    String html = "<h1>Eco-Dispenser status: " + String(ledState ? "ON" : "OFF") + "</h1>";
    request->send(200, "text/html", html);
  });

  // 3. Iniciar Server
  server.begin();
  Serial.println("🚀 Servidor iniciado!");
}

void loop() {
  // AsyncWebServer não precisa de nada no loop
}
