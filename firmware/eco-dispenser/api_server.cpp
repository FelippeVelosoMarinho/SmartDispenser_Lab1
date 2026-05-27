#include "api_server.h"
#include "config.h"
#include "carousel.h"
#include "alerts.h"
#include "buttons.h"
#include "provisioning.h"
#include <WiFi.h>

// ── JSON helper ───────────────────────────────────────────────────────
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
    if (inString  && c == '"')                           break;
    if (!inString && (c == ',' || c == '}' || c == ' ')) break;
    val += c;
  }
  return val;
}

// ── CORS helper ───────────────────────────────────────────────────────
// Encapsula request->send com os headers necessários para o browser chamar o ESP diretamente.
static void sendJson(AsyncWebServerRequest* request, int code, const String& json) {
  AsyncWebServerResponse* resp = request->beginResponse(code, "application/json", json);
  resp->addHeader("Access-Control-Allow-Origin", "*");
  resp->addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
  request->send(resp);
}

// ── Routes ────────────────────────────────────────────────────────────

void setupApiServer(AsyncWebServer& server) {

  // OPTIONS preflight — necessário para requisições cross-origin do browser
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
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest* request) {
    String json = "{";
    json += "\"current_slot\":"        + String(getCurrentSlot())                          + ",";
    json += "\"total_slots\":"         + String(TOTAL_SLOTS)                               + ",";
    json += "\"awaiting_confirm\":"    + String(isAwaitingConfirmation() ? "true" : "false") + ",";
    json += "\"last_confirmed_slot\":" + String(getLastConfirmedSlot())                    + ",";
    json += "\"wifi_rssi\":"           + String(WiFi.RSSI())                               + ",";
    json += "\"uptime_s\":"            + String(millis() / 1000);
    json += "}";
    sendJson(request, 200, json);
  });

  // POST /dispense
  // Body: {"period": "morning"|"afternoon"|"night", "silent_mode": true|false}
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
        period = "morning";
      }

      advanceCarousel();
      triggerDispenseAlert(silentMode, period);

      String resp = "{\"success\":true,\"current_slot\":" + String(getCurrentSlot()) + "}";
      sendJson(request, 200, resp);
    }
  );

  // POST /confirm
  server.on("/confirm", HTTP_POST,
    [](AsyncWebServerRequest* request) {
      int confirmed = getLastConfirmedSlot();
      resetLastConfirmedSlot();
      clearAlerts();
      String resp = "{\"success\":true,\"confirmed_slot\":" + String(confirmed) + "}";
      sendJson(request, 200, resp);
    },
    NULL,
    [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
      if (index + len >= total) {
        int confirmed = getLastConfirmedSlot();
        resetLastConfirmedSlot();
        clearAlerts();
        String resp = "{\"success\":true,\"confirmed_slot\":" + String(confirmed) + "}";
        sendJson(request, 200, resp);
      }
    }
  );

  // POST /calibrate
  server.on("/calibrate", HTTP_POST,
    [](AsyncWebServerRequest* request) {
      calibrateCarousel();
      clearAlerts();
      sendJson(request, 200, "{\"success\":true,\"current_slot\":0}");
    },
    NULL,
    [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
      if (index + len >= total) {
        calibrateCarousel();
        clearAlerts();
        sendJson(request, 200, "{\"success\":true,\"current_slot\":0}");
      }
    }
  );

  // POST /reset-wifi
  // Apaga credenciais da NVS e reinicia o ESP em modo BLE para re-provisionamento.
  server.on("/reset-wifi", HTTP_POST,
    [](AsyncWebServerRequest* request) {
      sendJson(request, 200, "{\"success\":true,\"message\":\"Reiniciando em modo BLE...\"}");
    },
    NULL,
    [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
      if (index + len >= total) {
        sendJson(request, 200, "{\"success\":true,\"message\":\"Reiniciando em modo BLE...\"}");
        clearStoredCredentials();
        delay(500);
        ESP.restart();
      }
    }
  );

  // GET /
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
