# Especificação de Provisionamento BLE - Smart Dispenser

Este documento define os UUIDs e os formatos de dados para comunicação entre o Firmware (ESP32) e a aplicação Frontend (React / Web Bluetooth) durante a configuração da rede Wi-Fi.

## 1. Identificadores BLE (UUIDs)

- **Service UUID (Provisionamento):** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
  - Utilizado pelo Frontend para encontrar o dispensador no momento do escaneamento.

- **Característica de Status (Read/Notify):** `8d268d37-2cd9-4c2f-b4de-c8f2d573d8df`
  - *Finalidade:* Permitir que o Frontend obtenha os dados básicos do hardware (`hardware_id` ou MAC Address) assim que conectar.
  - *Formato (Texto/JSON):* `{"hw_id":"AA:BB:CC:DD:EE:FF"}` (MAC Wi-Fi)

- **Característica de Configuração Wi-Fi (Write):** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
  - *Finalidade:* Ponto onde o Frontend enviará as credenciais de Wi-Fi.
  - *Formato (JSON):* `{"ssid":"Nome_da_Rede","pass":"Senha_da_Rede"}`

## 2. Fluxo no ESP32 (boot)

1. **Boot e Verificação:** Ao ligar, o ESP32 verifica na NVS (`wifi_creds`) se existem credenciais salvas.
2. **Modo BLE (Provisionamento):** Se não houver credenciais, o dispositivo inicia BLE com nome `Eco-Dispenser`.
3. **Recepção (Write):** O Frontend escreve SSID/senha na característica de Configuração; o firmware grava na NVS.
4. **Transição:** O ESP desliga BLE, conecta ao Wi-Fi e envia `POST /iot/heartbeat` ao backend.

Se o Wi-Fi falhar **3 vezes seguidas** (contador em NVS), as credenciais são apagadas e o dispositivo reinicia em modo BLE.

## 3. Reset de Wi-Fi (`POST /reset-wifi`)

Endpoint HTTP no firmware (porta 80, mesma rede local):

```http
POST /reset-wifi
```

**Resposta (antes do restart):**

```json
{"success":true,"message":"Reiniciando em modo BLE..."}
```

**Comportamento:**

1. `WiFi.disconnect(true, true)` — desassocia e apaga credenciais da flash do stack Wi-Fi
2. `WiFi.persistent(false)`
3. Apaga namespace NVS `wifi_creds` (`clearStoredCredentials`)
4. `ESP.restart()` — próximo boot entra em modo BLE

**Proxy no backend (painel):**

```http
POST /api/dispensers/{hardware_id}/forget-wifi
```

O backend usa o `ip_address` do último heartbeat e chama `http://{ip}/reset-wifi` no ESP.

## 4. Fluxo ao remover dispensador no painel

1. Cuidador confirma remoção em **Dispensadores**.
2. Frontend chama `POST /api/dispensers/{hardware_id}/forget-wifi`.
3. Se o ESP responder, o Wi-Fi é apagado e o aparelho reinicia em BLE.
4. Frontend chama `DELETE /api/dispensers/{hardware_id}` (registro no servidor).
5. Se o ESP estiver offline, o usuário pode **remover só do sistema** e seguir as instruções do modal.

## 5. Reset físico (sem app e sem rede)

Segure **volume +** e **volume -** ao mesmo tempo por **5 segundos**.

O firmware executa o mesmo `performWifiFactoryReset()` que `POST /reset-wifi` e reinicia em modo Bluetooth.

## 6. Comandos manuais (desenvolvimento / suporte)

Com o dispensador na rede:

```bash
curl -X POST http://<IP_DO_ESP>/reset-wifi
```

Via Serial (uma vez, recompilar): descomentar `clearStoredCredentials()` no `setup()` de `eco-dispenser.ino`.

Último recurso: `esptool.py erase_flash`.
