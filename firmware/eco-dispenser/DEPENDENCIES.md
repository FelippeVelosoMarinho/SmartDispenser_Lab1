# Dependências do Firmware Eco-Dispenser

Para garantir a compilação e funcionamento corretos do firmware do **Eco-Dispenser**, é fortemente recomendado utilizar as versões de bibliotecas e do Core especificadas abaixo. Atualizações não planejadas podem introduzir *breaking changes* (quebras de compatibilidade).

## Plataforma (Board Manager)

* **Placa:** ESP32C3 Dev Module (ou placas genéricas ESP32-C3 SuperMini)
* **Core / Board Package:** ESP32 by Espressif Systems
* **Versão Testada:** `3.x.x` (Ex: 3.0.x ou superior)

> **Nota:** A versão 3.x.x do ESP32 Core introduziu diversas mudanças em relação à versão 2.x, afetando principalmente bibliotecas como o AsyncTCP e NimBLE. Se você for utilizar a versão `2.x.x` do Core, pode ser necessário reverter os patches manuais aplicados nas bibliotecas.

## Bibliotecas (Library Manager)

* **NimBLE-Arduino** (por h2zero)
  * **Versão Testada:** `>= 2.0.0`
  * **Motivo:** O projeto utiliza o BLE (Bluetooth Low Energy) leve para provisionamento do WiFi através das classes `NimBLEDevice` e suas callbacks (ex: `NimBLECharacteristicCallbacks::onWrite` que agora aceita `NimBLEConnInfo&`).

* **ESPAsyncWebServer** (por me-no-dev / lacamera)
  * **Versão Testada:** Última disponível no repositório / Library Manager.
  * **Nota Crítica:** Com o ESP32 Core 3.x, há um erro conhecido ("discards qualifiers") envolvendo o `AsyncServer::status()` no arquivo `ESPAsyncWebServer.h`. Este problema foi contornado no código aplicando um `const_cast`. Se a biblioteca oficial receber uma atualização, este *patch* não será mais necessário.

* **AsyncTCP** (por me-no-dev / mathieucarbou)
  * Dependência automática do `ESPAsyncWebServer` para ESP32. Assegure-se de baixar as versões recentes que tentam manter compatibilidade com o Core 3.x.

## Solução de Problemas Comuns

1. **`undefined reference to 'BACKEND_URL'`:**
   Certifique-se de que o arquivo `secrets.h` existe na mesma pasta de `eco-dispenser.ino` e de que todas as constantes obrigatórias foram definidas:
   ```cpp
   const char* WIFI_SSID     = "...";
   const char* WIFI_PASSWORD = "...";
   const char* BACKEND_URL   = "http://seu-ip:porta"; // Ex: "http://192.168.1.5:3000"
   ```

2. **`'void WifiCfgCallbacks::onWrite(...)' marked 'override', but does not override`:**
   Este erro ocorre se a sua versão da biblioteca `NimBLE-Arduino` for antiga (série 1.x.x). Nela, o segundo parâmetro `NimBLEConnInfo&` não existia. Atualize a biblioteca ou ajuste o código em `provisioning.cpp`.

3. **Erro no `ESP_Async_WebServer` - `passing 'const AsyncServer' as 'this' argument discards qualifiers`:**
   Este erro ocorre quando usando o ESP32 Core 3.x+. A solução temporária aplicada no projeto foi envolver a chamada interna `_server.status()` num `const_cast<AsyncWebServer *>(this)` no arquivo `ESPAsyncWebServer.h` da biblioteca instalada na sua máquina.

4. **`text section exceeds available space in board` / `Sketch too big`:**
   O firmware utiliza BLE (NimBLE), WiFi e servidor web assíncrono. Juntos, eles geram um binário maior que o limite padrão de ~1.2MB alocado para o aplicativo no esquema de partições padrão do ESP32.
   **Solução:** Na Arduino IDE, vá em `Tools` -> `Partition Scheme` (Esquema de Partição) e altere de `Default 4MB with spiffs` para **`Huge APP (3MB No OTA/1MB SPIFFS)`** ou **`No OTA (2MB APP/2MB SPIFFS)`**. Em seguida, compile novamente.
