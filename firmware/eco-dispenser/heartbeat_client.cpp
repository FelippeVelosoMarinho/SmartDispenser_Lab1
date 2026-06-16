#include "heartbeat_client.h"
#include "config.h"
#include "provisioning.h"
#include "carousel.h"
#include "alerts.h"
#include "dispense_command.h"
#include "json_utils.h"

#include "carousel.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

static String sBackendUrl = "";
static String pendingAckCommandId = "";
static bool pendingAckSuccess = false;
static String pendingAckError = "";
static String lastExecutedCommandId = "";
static bool lastAckSuccess = false;
static String lastAckError = "";
static bool sEarlyHeartbeatPending = false;

void setBackendUrl(const String& url) {
  sBackendUrl = url;
}

void requestEarlyHeartbeat() {
  sEarlyHeartbeatPending = true;
}

bool consumeEarlyHeartbeat() {
  if (!sEarlyHeartbeatPending) return false;
  sEarlyHeartbeatPending = false;
  return true;
}

static void sendIotEvent(const String& mac, bool success, const String& errorMsg) {
  if (sBackendUrl.length() == 0 || WiFi.status() != WL_CONNECTED) return;

  String url = sBackendUrl + "/api/event";
  bool isHttps = url.startsWith("https://");

  WiFiClient* client = nullptr;
  if (isHttps) {
    WiFiClientSecure* secureClient = new WiFiClientSecure();
    secureClient->setInsecure();
    client = secureClient;
  } else {
    client = new WiFiClient();
  }

  HTTPClient http;
  if (http.begin(*client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("ngrok-skip-browser-warning", "true");
    http.setTimeout(5000);
    http.setReuse(false);

    String body = "{\"dispenser_id\":\"" + mac + "\","
                  "\"event_type\":\"dispensed\","
                  "\"success\":" + String(success ? "true" : "false");
    if (errorMsg.length() > 0) {
      body += ",\"error_message\":\"" + errorMsg + "\"";
    }
    body += "}";

    int code = http.POST(body);
    Serial.println("[Event] POST /api/event " + String(code));
    http.end();
  }
  delete client;
}

static void queueCommandAck(const String& commandId, bool success, const String& error) {
  pendingAckCommandId = commandId;
  pendingAckSuccess = success;
  pendingAckError = error;
}

static void processHeartbeatCommand(const String& responseBody, const String& mac) {
  if (responseBody.indexOf("\"command\":null") >= 0) {
    Serial.println("[Heartbeat] OK — nenhum comando na fila (command: null)");
    return;
  }
  if (responseBody.indexOf("\"command\":{") < 0) {
    Serial.println("[Heartbeat] OK — resposta sem campo command reconhecível");
    return;
  }

  String cmdId = extractJsonField(responseBody, "id");
  String cmdType = extractJsonField(responseBody, "type");
  if (cmdId.length() == 0) return;
  if (cmdType != "dispense" && cmdType != "calibrate" && cmdType != "confirm") return;

  if (cmdId == lastExecutedCommandId) {
    Serial.println("[Heartbeat] command already executed — re-ACK " + cmdId);
    queueCommandAck(cmdId, lastAckSuccess, lastAckError);
    return;
  }

  bool success = false;
  String errMsg = "";

  if (cmdType == "confirm") {
    Serial.println("[Heartbeat] ▶ comando recebido: CONFIRMAR (timeout backend) — limpando awaiting_confirm");
    clearAlerts();
    success = true;
  } else if (cmdType == "calibrate") {
    Serial.println("[Heartbeat] ▶ comando recebido: CALIBRAR roleta");
    calibrateCarousel();
    clearAlerts();
    success = true;
  } else {
    String period = extractJsonField(responseBody, "period");
    String silentStr = extractJsonField(responseBody, "silent_mode");
    String expectedStr = extractJsonField(responseBody, "expected_slot");
    bool silentMode = (silentStr == "true");
    bool hasExpected = (expectedStr.length() > 0);
    int expectedSlot = hasExpected ? expectedStr.toInt() : 0;

    Serial.println("[Heartbeat] ▶ comando recebido: DISPENSAR periodo=" + period +
                   " silent_mode=" + silentStr +
                   " expected_slot=" + expectedStr);

    DispenseResult result = executeDispense(period, silentMode, expectedSlot, hasExpected);
    success = result.success;
    errMsg = result.error ? String(result.error) : "";
    if (!success) {
      sendIotEvent(mac, false, errMsg);
    }
  }

  lastExecutedCommandId = cmdId;
  lastAckSuccess = success;
  lastAckError = errMsg;
  queueCommandAck(cmdId, success, errMsg);

  Serial.printf("[Heartbeat] Slot após comando: %d\n", getCurrentSlot());

  Serial.println("[Heartbeat] ACK enfileirado: " + cmdId +
                 " success=" + String(success ? "true" : "false"));
}

void sendPatientConfirmEvent() {
  String mac = getHardwareId();
  Serial.println("[Event] Paciente confirmou — enviando /api/event success=true");
  sendIotEvent(mac, true, "");
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (sBackendUrl.length() == 0) {
    Serial.println("[Heartbeat] BACKEND_URL não configurado — pulando.");
    return;
  }

  String url = sBackendUrl + "/api/heartbeat";
  bool isHttps = url.startsWith("https://");

  WiFiClient* client = nullptr;
  if (isHttps) {
    WiFiClientSecure* secureClient = new WiFiClientSecure();
    secureClient->setInsecure();
    client = secureClient;
  } else {
    client = new WiFiClient();
  }

  HTTPClient http;

  if (http.begin(*client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("ngrok-skip-browser-warning", "true");
    http.setTimeout(5000);
    http.setReuse(false);

    String mac = getHardwareId();
    String ip = WiFi.localIP().toString();

    String body = "{\"dispenser_id\":\"" + mac + "\","
                  "\"uptime_s\":" + String(millis() / 1000) + ","
                  "\"current_slot\":" + String(getCurrentSlot()) + ","
                  "\"wifi_rssi\":" + String(WiFi.RSSI()) + ","
                  "\"online\":true,"
                  "\"critical_stock\":" + String(isCriticalStock() ? "true" : "false") + ","
                  "\"awaiting_confirm\":" + String(isAwaitingConfirmation() ? "true" : "false") + ","
                  "\"ip_address\":\"" + ip + "\"";

    if (pendingAckCommandId.length() > 0) {
      body += ",\"command_ack\":{\"command_id\":\"" + pendingAckCommandId + "\","
              "\"success\":" + String(pendingAckSuccess ? "true" : "false");
      if (pendingAckError.length() > 0) {
        body += ",\"error\":\"" + pendingAckError + "\"";
      }
      body += "}";
      pendingAckCommandId = "";
      pendingAckError = "";
    }

    body += "}";

    int code = http.POST(body);
    String response = "";
    if (code > 0) {
      Serial.println("[Heartbeat] " + String(code) + " ← " + url);
      WiFiClient* stream = http.getStreamPtr();
      if (stream) {
        while (stream->available()) {
          response += (char)stream->read();
        }
      } else {
        response = http.getString();
      }
      if (code == 200 && response.length() > 0) {
        processHeartbeatCommand(response, mac);
      } else if (code != 200) {
        if (response.length() == 0) response = http.getString();
        Serial.println("[Heartbeat] Resposta Erro: " + response);
      }
    } else {
      Serial.println("[Heartbeat] Falha ao contactar backend: " + http.errorToString(code));
    }
    http.end();
    client->stop();
    delay(100);
  } else {
    Serial.println("[Heartbeat] Falha ao inicializar conexão HTTP");
  }
  delete client;
}
