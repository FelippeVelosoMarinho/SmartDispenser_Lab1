# Especificação de Provisionamento BLE - Smart Dispenser

Este documento define os UUIDs e os formatos de dados para comunicação entre o Firmware (ESP32-C3) e a aplicação Frontend (React / Web Bluetooth) durante a configuração da rede Wi-Fi.

## 1. Identificadores BLE (UUIDs)

- **Service UUID (Provisionamento):** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
  - Utilizado pelo Frontend para encontrar o dispensador no momento do escaneamento.

- **Característica de Status (Read/Notify):** `8d268d37-2cd9-4c2f-b4de-c8f2d573d8df`
  - *Finalidade:* Permitir que o Frontend obtenha os dados básicos do hardware (`hardware_id` ou MAC Address) assim que conectar, e possivelmente verificar os status do provisionamento.
  - *Formato (Texto/JSON):* `{"hw_id":"ESP-C3-1A2B3C"}`

- **Característica de Configuração Wi-Fi (Write):** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
  - *Finalidade:* Ponto onde o Frontend enviará as credenciais de Wi-Fi em texto plano.
  - *Formato (JSON):* `{"ssid":"Nome_da_Rede","pass":"Senha_da_Rede"}`

## 2. Fluxo no ESP32-C3

1. **Boot e Verificação:** Ao ligar, o ESP32 verifica na memória persistente (NVS) se existem credenciais de Wi-Fi salvas.
2. **Modo BLE (Provisionamento):** Se não houver credenciais (ou se houver falha de conexão persistente), o dispositivo inicia como um periférico BLE.
   - **Advertising:** O dispositivo deve fazer *broadcast* anunciando o Service UUID `4fafc201...`. O "Device Name" recomendado é `Eco-Dispenser`.
3. **Recepção (Write):** O Frontend escreve as credenciais na característica de Configuração. O ESP32 realiza o parse do JSON (ou extrai delimitadores se simplificarem).
4. **Transição:** Após o pareamento, o ESP32 desliga a antena Bluetooth, liga a de Wi-Fi (Station), conecta ao roteador e chama o endpoint da API na VM: `POST /iot/heartbeat` para se anunciar na plataforma.
