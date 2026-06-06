#include "provisioning.h"
#include "config.h"
#include <Preferences.h>
#include <NimBLEDevice.h>
#include <WiFi.h>
#include <esp_mac.h>

static const char* NVS_NS      = "wifi_creds";
static const char* NVS_SSID    = "ssid";
static const char* NVS_PASS    = "pass";
static const char* NVS_BURL    = "burl";
static const char* NVS_FAILS   = "wifi_fail_count";

// UUIDs definidos em firmware/BLE_PROVISIONING_SPEC.md
static const char* BLE_SERVICE_UUID  = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
static const char* BLE_STATUS_UUID   = "8d268d37-2cd9-4c2f-b4de-c8f2d573d8df";
static const char* BLE_WIFI_CFG_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

static volatile bool gProvisioningDone = false;

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

// ── Hardware ID ───────────────────────────────────────────────────────

String getHardwareId() {
  WiFi.mode(WIFI_STA);
  String mac = WiFi.macAddress();
  if (mac.length() > 0 && mac != "00:00:00:00:00:00") {
    return mac;
  }

  uint8_t bytes[6] = {0};
  esp_read_mac(bytes, ESP_MAC_WIFI_STA);
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
  return String(buf);
}

// ── NVS ───────────────────────────────────────────────────────────────

bool hasStoredCredentials() {
  Preferences prefs;
  prefs.begin(NVS_NS, true);
  bool has = prefs.isKey(NVS_SSID) && prefs.getString(NVS_SSID, "").length() > 0;
  prefs.end();
  return has;
}

String getStoredSsid() {
  Preferences prefs;
  prefs.begin(NVS_NS, true);
  String s = prefs.getString(NVS_SSID, "");
  prefs.end();
  return s;
}

String getStoredPassword() {
  Preferences prefs;
  prefs.begin(NVS_NS, true);
  String s = prefs.getString(NVS_PASS, "");
  prefs.end();
  return s;
}

String getStoredBackendUrl() {
  Preferences prefs;
  prefs.begin(NVS_NS, true);
  String s = prefs.getString(NVS_BURL, "");
  prefs.end();
  return s;
}

void saveCredentials(const String& ssid, const String& pass, const String& burl) {
  Preferences prefs;
  prefs.begin(NVS_NS, false);
  prefs.putString(NVS_SSID, ssid);
  prefs.putString(NVS_PASS, pass);
  if (burl.length() > 0) {
    prefs.putString(NVS_BURL, burl);
  }
  prefs.end();
}

void clearStoredCredentials() {
  Preferences prefs;
  prefs.begin(NVS_NS, false);
  prefs.clear();
  prefs.end();
  Serial.println("[Prov] Credenciais WiFi apagadas da NVS.");
}

static bool     gPendingFactoryReset = false;
static unsigned long gFactoryResetAt = 0;

void performWifiFactoryReset() {
  Serial.println("[Prov] Reset de Wi-Fi solicitado — apagando credenciais...");
  WiFi.disconnect(true, true);
  WiFi.persistent(false);
  clearStoredCredentials();
  resetWifiFailureCount();
  delay(500);
  ESP.restart();
}

void scheduleWifiFactoryReset(unsigned long delayMs) {
  gPendingFactoryReset = true;
  gFactoryResetAt = millis() + delayMs;
}

void processPendingWifiFactoryReset() {
  if (gPendingFactoryReset && (long)(millis() - gFactoryResetAt) >= 0) {
    gPendingFactoryReset = false;
    performWifiFactoryReset();
  }
}

int getWifiFailureCount() {
  Preferences prefs;
  prefs.begin(NVS_NS, false);
  int n = prefs.getInt(NVS_FAILS, 0);
  prefs.end();
  return n;
}

int incrementWifiFailureCount() {
  Preferences prefs;
  prefs.begin(NVS_NS, false);
  int n = prefs.getInt(NVS_FAILS, 0);
  n++;
  prefs.putInt(NVS_FAILS, n);
  prefs.end();
  return n;
}

void resetWifiFailureCount() {
  Preferences prefs;
  prefs.begin(NVS_NS, false);
  prefs.putInt(NVS_FAILS, 0);
  prefs.end();
}

// ── BLE ───────────────────────────────────────────────────────────────

class WifiCfgCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override {
    String payload = String(pChar->getValue().c_str());
    Serial.println("[BLE] Recebido: " + payload);

    String ssid = extractField(payload, "ssid");
    String pass = extractField(payload, "pass");
    String burl = extractField(payload, "backend_url");

    if (ssid.length() == 0) {
      Serial.println("[BLE] SSID ausente — payload ignorado.");
      return;
    }

    saveCredentials(ssid, pass, burl);
    Serial.println("[BLE] Credenciais salvas. SSID: " + ssid + (burl.length() > 0 ? " BURL: " + burl : ""));
    gProvisioningDone = true;
  }
};

void runBleProvisioning() {
  Serial.println("[BLE] Iniciando provisionamento. Abra o app e conecte ao 'Eco-Dispenser'.");
  gProvisioningDone = false;

  NimBLEDevice::init("Eco-Dispenser");
  NimBLEServer*  pServer  = NimBLEDevice::createServer();
  NimBLEService* pService = pServer->createService(BLE_SERVICE_UUID);

  // Característica de status (read): expõe o MAC como hardware_id
  NimBLECharacteristic* pStatusChar = pService->createCharacteristic(
    BLE_STATUS_UUID, NIMBLE_PROPERTY::READ
  );
  String hwId = getHardwareId();
  Serial.println("[BLE] hardware_id: " + hwId);
  String hwJson = "{\"hw_id\":\"" + hwId + "\"}";
  pStatusChar->setValue(hwJson.c_str());

  // Característica de config WiFi (write): recebe {"ssid":"...","pass":"..."}
  NimBLECharacteristic* pWifiChar = pService->createCharacteristic(
    BLE_WIFI_CFG_UUID, NIMBLE_PROPERTY::WRITE
  );
  pWifiChar->setCallbacks(new WifiCfgCallbacks());

  pService->start();

  NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(BLE_SERVICE_UUID);
  pAdv->start();
  Serial.println("[BLE] Advertising iniciado...");

  // Pisca LED onboard até receber credenciais
  while (!gProvisioningDone) {
    LED_ONBOARD_TOGGLE();
    delay(300);
  }

  Serial.println("[BLE] Provisionamento concluído. Encerrando BLE...");
  NimBLEDevice::stopAdvertising();
  NimBLEDevice::deinit(true);  // libera o rádio para o WiFi
  delay(200);
}
