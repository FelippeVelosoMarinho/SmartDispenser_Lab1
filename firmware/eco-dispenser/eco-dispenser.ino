/*
 * Eco-Dispenser Inteligente
 * Firmware: ESP32-C3 SuperMini
 *
 * Arquitetura:
 *   config.h      — pinos e constantes
 *   provisioning  — credenciais WiFi via NVS/BLE (NimBLE-Arduino)
 *   carousel      — controle da roleta (servo + NVS)
 *   alerts        — LEDs de período, buzzer, vibração
 *   buttons       — botões com debounce
 *   api_server    — endpoints HTTP (AsyncWebServer)
 *
 * Fluxo de boot:
 *   1. Verifica NVS por credenciais WiFi salvas
 *   2. Fallback: usa WIFI_SSID/WIFI_PASSWORD de secrets.h (se não vazio)
 *   3. Sem credenciais → modo BLE: aguarda app enviar SSID+senha
 *   4. Conecta ao WiFi → envia heartbeat → sobe servidor HTTP
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESPAsyncWebServer.h>
#include "secrets.h"
#include "config.h"
#include "provisioning.h"
#include "carousel.h"
#include "alerts.h"
#include "buttons.h"
#include "api_server.h"

AsyncWebServer server(SERVER_PORT);

// Variáveis para o Heartbeat periódico
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutos

static void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (strlen(BACKEND_URL) == 0) {
    Serial.println("[Heartbeat] BACKEND_URL não configurado — pulando.");
    return;
  }

  HTTPClient http;
  String url = String(BACKEND_URL) + "/iot/heartbeat";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  // dispenser_id usa o MAC address como identificador único do hardware
  String mac  = WiFi.macAddress();
  String body = "{\"dispenser_id\":\"" + mac + "\","
                "\"uptime_s\":" + String(millis() / 1000) + ","
                "\"current_slot\":" + String(getCurrentSlot()) + ","
                "\"wifi_rssi\":" + String(WiFi.RSSI()) + ","
                "\"online\":true}";

  int code = http.POST(body);
  if (code > 0) {
    Serial.println("[Heartbeat] " + String(code) + " ← " + url);
  } else {
    Serial.println("[Heartbeat] Falha ao contactar backend: " + http.errorToString(code));
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  unsigned long startWait = millis();
  while (!Serial && millis() - startWait < 5000) {
    delay(10);
  }

  Serial.println("\n🌿 Eco-Dispenser iniciando...");

  // FORÇA A LIMPEZA DA MEMÓRIA PARA GARANTIR QUE VÁ PARA O BLUETOOTH (Comentado para produção)
  // clearStoredCredentials();

  pinMode(LED_ONBOARD, OUTPUT);
  digitalWrite(LED_ONBOARD, HIGH); // HIGH = apagado (lógica invertida no SuperMini)

  // carouselSetup();
  // alertsSetup();
  // buttonsSetup();

  // ── Obter credenciais WiFi ────────────────────────────────────────────
  String ssid, pass;

  if (hasStoredCredentials()) {
    ssid = getStoredSsid();
    pass = getStoredPassword();
    Serial.println("📁 Credenciais carregadas da NVS. SSID: " + ssid);

  } else if (strlen(WIFI_SSID) > 0) {
    // Primeira vez com secrets.h preenchido: salva na NVS para boots futuros
    ssid = String(WIFI_SSID);
    pass = String(WIFI_PASSWORD);
    saveCredentials(ssid, pass);
    Serial.println("📄 Credenciais de secrets.h migradas para NVS. SSID: " + ssid);

  } else {
    // Sem credenciais em nenhuma fonte → provisionamento via BLE
    Serial.println("⚠️  Sem credenciais WiFi. Iniciando modo BLE...");
    runBleProvisioning();
    ssid = getStoredSsid();
    pass = getStoredPassword();
  }

  // ── Conectar ao WiFi ──────────────────────────────────────────────────
  Serial.println("Conectando ao Wi-Fi: " + ssid);
  WiFi.begin(ssid.c_str(), pass.c_str());

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_ONBOARD, !digitalRead(LED_ONBOARD));
    retries++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    // Credenciais provavelmente erradas — limpa e reinicia para tentar BLE
    Serial.println("\n❌ Falha ao conectar. Limpando credenciais e reiniciando...");
    clearStoredCredentials();
    delay(1000);
    ESP.restart();
  }

  digitalWrite(LED_ONBOARD, HIGH);
  Serial.println("\n✅ Wi-Fi conectado!");
  Serial.print("📍 IP: ");
  Serial.println(WiFi.localIP());

  // Aguarda a estabilização da rede para evitar conflitos de concorrência na pilha lwIP
  Serial.println("[Rede] Aguardando estabilização (3s)...");
  delay(3000);

  sendHeartbeat();
  lastHeartbeat = millis(); // Inicia a contagem de tempo do heartbeat

  setupApiServer(server);
  server.begin();
  Serial.println("🚀 Servidor HTTP iniciado na porta " + String(SERVER_PORT));
}

void loop() {
  checkButtons();

  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  delay(10);
}
