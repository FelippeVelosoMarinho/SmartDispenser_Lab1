#include "api_server.h"
#include "config.h"
#include "carousel.h"
#include "alerts.h"
#include "buttons.h"
#include <WiFi.h>

// ── JSON helper ───────────────────────────────────────────────────────
// Extrai o valor de uma chave em um JSON simples (sem biblioteca externa).
// Funciona para strings, booleanos e números.
static String extractField(const String& body, const String& key) {
  int keyPos = body.indexOf("\"" + key + "\"");
  if (keyPos == -1) return "";

  int colonPos = body.indexOf(":", keyPos);
  if (colonPos == -1) return "";

  int valStart = colonPos + 1;
  while (valStart < (int)body.length() && body[valStart] == ' ') valStart++;

  bool inString = (body[valStart] == '"');
  if (inString) valStart++;

  String val = "";
  for (int i = valStart; i < (int)body.length(); i++) {
    char c = body[i];
    if (inString  && c == '"')                        break;
    if (!inString && (c == ',' || c == '}' || c == ' ')) break;
    val += c;
  }
  return val;
}

// ── Routes ────────────────────────────────────────────────────────────

// Sends a JSON response with CORS headers so the browser dashboard can fetch directly.
static void sendJson(AsyncWebServerRequest* request, int code, const String& json) {
  AsyncWebServerResponse* resp = request->beginResponse(code, "application/json", json);
  resp->addHeader("Access-Control-Allow-Origin", "*");
  resp->addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
  request->send(resp);
}

void setupApiServer(AsyncWebServer& server) {

  // OPTIONS preflight for CORS
  server.onNotFound([](AsyncWebServerRequest* request) {
    if (request->method() == HTTP_OPTIONS) {
      AsyncWebServerResponse* resp = request->beginResponse(204);
      resp->addHeader("Access-Control-Allow-Origin", "*");
      resp->addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
      request->send(resp);
    } else {
      request->send(404, "application/json", "{\"error\":\"not found\"}");
    }
  });

  // GET /status
  // Retorna estado completo da roleta para o backend fazer polling.
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest* request) {
    String json = "{";
    json += "\"current_slot\":"         + String(getCurrentSlot())             + ",";
    json += "\"total_slots\":"           + String(TOTAL_SLOTS)                  + ",";
    json += "\"awaiting_confirm\":"      + String(isAwaitingConfirmation() ? "true" : "false") + ",";
    json += "\"last_confirmed_slot\":"   + String(getLastConfirmedSlot())        + ",";
    json += "\"wifi_rssi\":"             + String(WiFi.RSSI())                  + ",";
    json += "\"uptime_s\":"              + String(millis() / 1000);
    json += "}";
    sendJson(request, 200, json);
  });

  // POST /dispense
  // Body esperado: {"slot": 4, "period": "morning", "silent_mode": false}
  // Avança a roleta 1 posição e dispara o alerta correto.
  server.on("/dispense", HTTP_POST,
    [](AsyncWebServerRequest* request) {},
    NULL,
    [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
      String body = "";
      for (size_t i = 0; i < len; i++) body += (char)data[i];
      Serial.println("POST /dispense: " + body);

      String period    = extractField(body, "period");
      String silentStr = extractField(body, "silent_mode");
      bool silentMode  = (silentStr == "true");

      if (period != "morning" && period != "afternoon" && period != "night") {
        period = "morning"; // fallback seguro
      }

      advanceCarousel();
      triggerDispenseAlert(silentMode, period);

      String resp = "{\"success\":true,\"current_slot\":" + String(getCurrentSlot()) + "}";
      sendJson(request, 200, resp);
    }
  );

  // POST /confirm
  // Chamado pelo backend após verificar que o paciente confirmou (via botão).
  // Limpa o slot confirmado do estado interno.
  server.on("/confirm", HTTP_POST,
    [](AsyncWebServerRequest* request) {},
    NULL,
    [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
      int confirmed = getLastConfirmedSlot();
      resetLastConfirmedSlot();
      clearAlerts();
      String resp = "{\"success\":true,\"confirmed_slot\":" + String(confirmed) + "}";
      sendJson(request, 200, resp);
    }
  );

  // POST /calibrate
  // Reseta a roleta para o slot 0 após recarga completa.
  server.on("/calibrate", HTTP_POST,
    [](AsyncWebServerRequest* request) {},
    NULL,
    [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
      calibrateCarousel();
      clearAlerts();
      sendJson(request, 200, "{\"success\":true,\"current_slot\":0}");
    }
  );

  // GET /
  // Página HTML de diagnóstico — útil para testar via navegador.
  server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
    String html  = "<h1>🌿 Eco-Dispenser</h1>";
    html += "<p>Slot atual: <b>" + String(getCurrentSlot()) + "</b> / " + String(TOTAL_SLOTS) + "</p>";
    html += "<p>Aguardando confirmação: <b>" + String(isAwaitingConfirmation() ? "Sim" : "Não") + "</b></p>";
    html += "<p>Último slot confirmado: <b>" + String(getLastConfirmedSlot()) + "</b></p>";
    html += "<p>Uptime: <b>" + String(millis() / 1000) + "s</b></p>";
    html += "<p>Wi-Fi RSSI: <b>" + String(WiFi.RSSI()) + " dBm</b></p>";
    request->send(200, "text/html", html);
  });
}