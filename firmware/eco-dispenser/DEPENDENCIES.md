# Dependências do Firmware Eco-Dispenser

Para garantir a compilação e funcionamento corretos do firmware do **Eco-Dispenser**, é fortemente recomendado utilizar as versões de bibliotecas e do Core especificadas abaixo. Atualizações não planejadas podem introduzir *breaking changes* (quebras de compatibilidade).

## Plataforma (Board Manager)

* **Placa:** ESP32C3 Dev Module (ou placas genéricas ESP32-C3 SuperMini)
* **Core / Board Package:** ESP32 by Espressif Systems
* **Versão Recomendada:** `3.0.x+`

> **Nota:** A versão 3.x.x do ESP32 Core introduziu diversas mudanças em relação à versão 2.x, afetando principalmente bibliotecas como o AsyncTCP e NimBLE. Se você for utilizar a versão `2.x.x` do Core, pode ser necessário reverter os patches manuais aplicados nas bibliotecas.

## Bibliotecas (Library Manager)

* **NimBLE-Arduino** (por h2zero)
  * **Versão Testada:** `>= 2.0.0`
  * **Motivo:** O projeto utiliza o BLE (Bluetooth Low Energy) leve para provisionamento do WiFi através das classes `NimBLEDevice` e suas callbacks (ex: `NimBLECharacteristicCallbacks::onWrite` que agora aceita `NimBLEConnInfo&`).

* **ESP Async WebServer** (por ESP32Async / mathieucarbou)
  * **Versão Recomendada:** `>= 3.6.x`
  * **Importante:** Instale a biblioteca com espaços no nome (**ESP Async WebServer**). A biblioteca antiga `ESPAsyncWebServer` (sem espaços) costuma estar desatualizada e pode causar o crash `assert failed: tcp_alloc (Required to lock TCPIP core functionality!)` no Core 3.x.

* **Async TCP** (por ESP32Async / mathieucarbou)
  * **Versão Recomendada:** `>= 3.3.6`
  * **Importante:** Instale a biblioteca com espaços no nome (**Async TCP**). A biblioteca antiga `AsyncTCP` (sem espaços) pode ser incompatível com o Core 3.x.

### Limpeza obrigatória de bibliotecas antigas (evita conflito silencioso)

Antes de compilar no Core 3.x, remova completamente instalações antigas para não misturar forks:

1. Feche a Arduino IDE.
2. Vá até a pasta `~/Arduino/libraries/`.
3. Remova (se existirem): `ESPAsyncWebServer` e `AsyncTCP`.
4. Abra a IDE novamente e instale apenas:
   - `ESP Async WebServer` (ESP32Async / mathieucarbou)
   - `Async TCP` (ESP32Async / mathieucarbou)
5. Recompile e confira no log de compilação que os caminhos usados incluem os nomes com espaço/fork novo.

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

3. **Mistura de bibliotecas Async (crashes/reset após conectar no Wi-Fi):**
   Se o firmware compila, conecta e logo reinicia com `tcp_alloc`, quase sempre existe conflito entre versões/forks.
   **Solução:** remova as libs antigas (`ESPAsyncWebServer` / `AsyncTCP`), mantenha somente os forks (`ESP Async WebServer` / `Async TCP`) e compile com ESP32 Core `3.0.x+`.

4. **`text section exceeds available space in board` / `Sketch too big`:**
   O firmware utiliza BLE (NimBLE), WiFi e servidor web assíncrono. Juntos, eles geram um binário maior que o limite padrão de ~1.2MB alocado para o aplicativo no esquema de partições padrão do ESP32.
   **Solução:** Na Arduino IDE, vá em `Tools` -> `Partition Scheme` (Esquema de Partição) e altere de `Default 4MB with spiffs` para **`Huge APP (3MB No OTA/1MB SPIFFS)`** ou **`No OTA (2MB APP/2MB SPIFFS)`**. Em seguida, compile novamente.
