/*
 * Eco-Dispenser Inteligente
 * Firmware: ESP32 (multi-placa — ver config.h)
 *
 * Arquitetura:
 *   config.h      — pinos e constantes
 *   provisioning  — credenciais WiFi via NVS/BLE (NimBLE-Arduino)
 *   carousel      — controle da roleta (servo + NVS)
 *   alerts        — LEDs de período, buzzer, vibração
 *   buttons       — botões com debounce
 *   api_server       — endpoints HTTP (AsyncWebServer)
 *   heartbeat_client — pull de comandos via POST /api/heartbeat
 *   dispense_command — lógica compartilhada de dispensação
 *
 * Fluxo de boot:
 *   1. Verifica NVS por credenciais WiFi salvas
 *   2. Fallback: usa WIFI_SSID/WIFI_PASSWORD de secrets.h (se não vazio)
 *   3. Sem credenciais → modo BLE: aguarda app enviar SSID+senha
 *   4. Conecta ao WiFi → envia heartbeat → sobe servidor HTTP
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "secrets.h"
#include "config.h"
#include "provisioning.h"
#include "carousel.h"
#include "alerts.h"
#include "buttons.h"
#include "api_server.h"
#include "heartbeat_client.h"

AsyncWebServer server(SERVER_PORT);

// Variáveis para o Heartbeat periódico
unsigned long lastHeartbeat = 0;
static bool pendingInitialHeartbeat = true;
static unsigned long initialHeartbeatAt = 0;
static wl_status_t lastWifiStatus = WL_IDLE_STATUS;

String globalBackendUrl = "";

void setup() {
  Serial.begin(115200);
  unsigned long startWait = millis();
  while (!Serial && millis() - startWait < 5000) {
    delay(10);
  }

  Serial.println("\n🌿 Eco-Dispenser iniciando (" BOARD_LABEL ")...");

  // FORÇA A LIMPEZA DA MEMÓRIA PARA GARANTIR QUE VÁ PARA O BLUETOOTH (Comentado para produção)
  // clearStoredCredentials();

  pinMode(LED_ONBOARD, OUTPUT);
  LED_ONBOARD_OFF();

  carouselSetup();
  alertsSetup();
  buttonsSetup();

  // ── Obter credenciais WiFi ────────────────────────────────────────────
  String ssid, pass;

  if (hasStoredCredentials()) {
    ssid = getStoredSsid();
    pass = getStoredPassword();
    globalBackendUrl = getStoredBackendUrl();

    // Se secrets.h divergir da NVS, secrets.h prevalece — permite trocar rede/URL
    // sem factory reset: basta editar secrets.h e reflashear.
    bool needsSave = false;
    if (strlen(WIFI_SSID) > 0 && ssid != String(WIFI_SSID)) {
      ssid = String(WIFI_SSID);
      pass = String(WIFI_PASSWORD);
      needsSave = true;
      Serial.println("📝 Credenciais WiFi atualizadas via secrets.h: " + ssid);
    }
    if (strlen(BACKEND_URL) > 0 && globalBackendUrl != String(BACKEND_URL)) {
      globalBackendUrl = String(BACKEND_URL);
      needsSave = true;
      Serial.println("📝 URL do backend atualizada via secrets.h: " + globalBackendUrl);
    }
    if (needsSave) saveCredentials(ssid, pass, globalBackendUrl);
    Serial.println("📁 Credenciais carregadas. SSID: " + ssid);

  } else if (strlen(WIFI_SSID) > 0) {
    // Primeira vez com secrets.h preenchido: salva na NVS para boots futuros
    ssid = String(WIFI_SSID);
    pass = String(WIFI_PASSWORD);
    globalBackendUrl = String(BACKEND_URL);
    saveCredentials(ssid, pass, globalBackendUrl);
    Serial.println("📄 Credenciais de secrets.h migradas para NVS. SSID: " + ssid);

  } else {
    // Sem credenciais em nenhuma fonte → provisionamento via BLE
    Serial.println("⚠️  Sem credenciais WiFi. Iniciando modo BLE...");
    runBleProvisioning();
    ssid = getStoredSsid();
    pass = getStoredPassword();
    globalBackendUrl = getStoredBackendUrl();
  }

  // Fallback seguro caso NVS não tenha URL (p.ex. ESP atualizado sem apagar credenciais)
  if (globalBackendUrl.length() == 0 && strlen(BACKEND_URL) > 0) {
    globalBackendUrl = String(BACKEND_URL);
    saveCredentials(ssid, pass, globalBackendUrl);
  }

  // ── Conectar ao WiFi ──────────────────────────────────────────────────
  Serial.println("Conectando ao Wi-Fi: " + ssid);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.setSleep(WIFI_PS_NONE);
  WiFi.begin(ssid.c_str(), pass.c_str());
  lastWifiStatus = WiFi.status();

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    LED_ONBOARD_TOGGLE();
    retries++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    // Não apaga credenciais na primeira falha: isso causa loop BLE infinito em quedas/transientes.
    int fails = incrementWifiFailureCount();
    Serial.println("\n❌ Falha ao conectar ao Wi-Fi. Tentativas consecutivas: " + String(fails));
    if (fails >= 3) {
      Serial.println("🧹 Muitas falhas consecutivas. Limpando credenciais e reiniciando em modo BLE...");
      clearStoredCredentials();
      resetWifiFailureCount();
      delay(500);
    } else {
      Serial.println("🔁 Reiniciando para tentar reconectar (sem apagar credenciais)...");
      delay(500);
    }
    ESP.restart();
  }

  LED_ONBOARD_OFF();
  Serial.println("\n✅ Wi-Fi conectado!");
  Serial.print("📍 IP: ");
  Serial.println(WiFi.localIP());
  resetWifiFailureCount();

  // Aguarda a estabilização da rede para evitar conflitos de concorrência na pilha lwIP
  Serial.println("[Rede] Aguardando estabilização (3s)...");
  delay(3000);

  setupApiServer(server);
  server.begin();
  Serial.println("🚀 Servidor HTTP iniciado na porta " + String(SERVER_PORT));

  setBackendUrl(globalBackendUrl);

  // Evita disparar HTTP no exato instante pós-conexão/pós-BLE deinit.
  pendingInitialHeartbeat = true;
  initialHeartbeatAt = millis() + 2000;
  lastHeartbeat = millis();
}

void loop() {
  processPendingWifiFactoryReset();
  alertsTick(millis());
  checkButtons();

  wl_status_t currentWifiStatus = WiFi.status();
  if (currentWifiStatus != lastWifiStatus) {
    if (currentWifiStatus == WL_CONNECTED) {
      Serial.println("[WiFi] Reconectado automaticamente. Agendando heartbeat imediato...");
      pendingInitialHeartbeat = true;
      initialHeartbeatAt = millis() + 1000;
    } else {
      Serial.println("[WiFi] Conexão perdida. Aguardando reconexão...");
    }
    lastWifiStatus = currentWifiStatus;
  }

  if (pendingInitialHeartbeat && WiFi.status() == WL_CONNECTED && (long)(millis() - initialHeartbeatAt) >= 0) {
    sendHeartbeat();
    pendingInitialHeartbeat = false;
    lastHeartbeat = millis();
  }

  if (WiFi.status() == WL_CONNECTED && consumeEarlyHeartbeat()) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  if (WiFi.status() == WL_CONNECTED && millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  delay(10);
}
