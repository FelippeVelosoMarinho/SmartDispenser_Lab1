#include "api_server.h"
#include "config.h"
#include "carousel.h"
#include "alerts.h"
#include "buttons.h"
#include "provisioning.h"
#include "dispense_command.h"
#include "json_utils.h"
#include <WiFi.h>

// ── Demo state machine ───────────────────────────────────────────────
static bool demoRunning = false;
static int  demoStep    = 0;           // 0=idle, 1..3=executando
static unsigned long demoNextAt = 0;
static const char* DEMO_PERIODS[] = {"morning", "afternoon", "night"};

void demoTick() {
  if (!demoRunning) return;
  if ((long)(millis() - demoNextAt) < 0) return;

  if (demoStep >= 3) {
    demoRunning = false;
    demoStep = 0;
    clearAlerts();
    Serial.println("🧪 Demo concluída!");
    return;
  }

  clearAlerts();
  delay(200);

  String period = String(DEMO_PERIODS[demoStep]);
  Serial.printf("🧪 Demo etapa %d: %s\n", demoStep + 1, period.c_str());

  advanceCarousel();
  triggerDispenseAlert(false, period);

  demoStep++;
  demoNextAt = millis() + 30000;
}

bool isDemoRunning() {
  return demoRunning;
}

int getDemoStep() {
  return demoStep;
}

// ── CORS helper ───────────────────────────────────────────────────────
static void sendJson(AsyncWebServerRequest* request, int code, const String& json) {
  AsyncWebServerResponse* resp = request->beginResponse(code, "application/json", json);
  resp->addHeader("Access-Control-Allow-Origin", "*");
  resp->addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
  request->send(resp);
}

// ── Routes ────────────────────────────────────────────────────────────

void setupApiServer(AsyncWebServer& server) {

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

  server.on("/status", HTTP_GET, [](AsyncWebServerRequest* request) {
    String json = "{";
    json += "\"current_slot\":"        + String(getCurrentSlot())                          + ",";
    json += "\"total_slots\":"         + String(TOTAL_SLOTS)                               + ",";
    json += "\"awaiting_confirm\":"    + String(isAwaitingConfirmation() ? "true" : "false") + ",";
    json += "\"last_confirmed_slot\":" + String(getLastConfirmedSlot())                    + ",";
    json += "\"wifi_rssi\":"           + String(WiFi.RSSI())                               + ",";
    json += "\"hardware_id\":\""      + getHardwareId()                                   + "\",";
    json += "\"uptime_s\":"            + String(millis() / 1000);
    json += "}";
    sendJson(request, 200, json);
  });

  server.on("/dispense", HTTP_POST,
    [](AsyncWebServerRequest* request) {},
    NULL,
    [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
      String body = "";
      for (size_t i = 0; i < len; i++) body += (char)data[i];
      Serial.println("POST /dispense: " + body);

      String period = extractJsonField(body, "period");
      String silentStr = extractJsonField(body, "silent_mode");
      String expectedStr = extractJsonField(body, "expected_slot");
      bool silentMode = (silentStr == "true");
      bool hasExpected = (expectedStr.length() > 0);
      int expectedSlot = hasExpected ? expectedStr.toInt() : 0;

      DispenseResult result = executeDispense(period, silentMode, expectedSlot, hasExpected);

      if (!result.success) {
        int httpCode = 400;
        if (String(result.error) == "slot_mismatch") httpCode = 409;
        if (String(result.error) == "awaiting_confirm") httpCode = 409;
        String resp = buildDispenseResponseJson(result, hasExpected ? expectedSlot : 0);
        sendJson(request, httpCode, resp);
        return;
      }

      String resp = buildDispenseResponseJson(result);
      sendJson(request, 200, resp);
    }
  );

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

  server.on("/reset-wifi", HTTP_POST, [](AsyncWebServerRequest* request) {
    sendJson(request, 200, "{\"success\":true,\"message\":\"Reiniciando em modo BLE...\"}");
    scheduleWifiFactoryReset(400);
  });

  // ── Demo endpoints ────────────────────────────────────────────────
  server.on("/demo", HTTP_POST, [](AsyncWebServerRequest* request) {
    if (demoRunning) {
      sendJson(request, 409, "{\"success\":false,\"error\":\"demo_already_running\"}");
      return;
    }
    demoRunning = true;
    demoStep = 0;
    demoNextAt = millis();   // começa imediatamente
    Serial.println("🧪 Demo de calibração iniciada!");
    sendJson(request, 200, "{\"success\":true,\"message\":\"Demo iniciada\"}");
  });

  server.on("/demo-status", HTTP_GET, [](AsyncWebServerRequest* request) {
    String phase = "idle";
    if (demoRunning && demoStep == 0) phase = "starting";
    else if (demoRunning && demoStep == 1) phase = "morning";
    else if (demoRunning && demoStep == 2) phase = "afternoon";
    else if (demoRunning && demoStep == 3) phase = "night";
    else if (!demoRunning && demoStep == 0) phase = "idle";

    String json = "{";
    json += "\"running\":" + String(demoRunning ? "true" : "false") + ",";
    json += "\"step\":" + String(demoStep) + ",";
    json += "\"phase\":\"" + phase + "\"";
    json += "}";
    sendJson(request, 200, json);
  });

  server.on("/demo-stop", HTTP_POST, [](AsyncWebServerRequest* request) {
    demoRunning = false;
    demoStep = 0;
    clearAlerts();
    Serial.println("🧪 Demo parada manualmente.");
    sendJson(request, 200, "{\"success\":true,\"message\":\"Demo parada\"}");
  });

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
