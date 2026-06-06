# 🔌 Firmware — ESP32 (multi-placa)

Este diretório contém o firmware do **Eco-Dispenser**, compilável para diferentes variantes de ESP32 sem alterar pinos manualmente a cada troca de placa.

## Placas suportadas

| Placa | Board na IDE | Arquivo de pinos |
|-------|--------------|------------------|
| ESP32-C3 SuperMini | `ESP32C3 Dev Module` | `boards/config_c3_supermini.h` |
| ESP32 WROOM / DevKit | `ESP32 Dev Module` | `boards/config_wroom32.h` |

A seleção é **automática** com base na placa escolhida em `Tools > Board`. Para forçar manualmente, descomente `#define BOARD_ESP32_...` em `eco-dispenser/config.h`.

Cada arquivo de placa define pinos, polaridade do LED onboard e se o servo exige `ESP32PWM::allocateTimer()`.

### ESP32-C3 SuperMini

https://randomnerdtutorials.com/getting-started-esp32-c3-super-mini/

## 📋 Configuração do Arduino IDE

Para compilar este projeto, você deve configurar seu ambiente seguindo estes passos:

### 1. Adicionar Placa ESP32

1. Vá em `File > Preferences`.
2. Em `Additional Board Manager URLs`, adicione:  
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. Vá em `Tools > Board > Boards Manager`.
4. Procure por `esp32` (da Espressif Systems).
5. **Recomendado**: Selecione a versão **3.0.x+** e clique em Install.
   - Use apenas os forks mantidos: **ESP Async WebServer** + **Async TCP**.
   - **Não misture** com `ESPAsyncWebServer` / `AsyncTCP` (sem espaços), pois isso costuma causar `assert failed: tcp_alloc (Required to lock TCPIP core functionality!)`.

### 2. Instalar Bibliotecas (Manual)

Vá em `Sketch > Include Library > Manage Libraries...` e instale:

1. **ESP Async WebServer** (autor: ESP32Async / mathieucarbou).
2. **Async TCP** (autor: ESP32Async / mathieucarbou).

Antes de instalar, faça uma limpeza:

1. Feche a Arduino IDE.
2. Remova as pastas antigas em `~/Arduino/libraries/`:
   - `ESPAsyncWebServer`
   - `AsyncTCP`
3. Reabra a IDE e instale apenas as bibliotecas acima.

### 3. Configurações de Upload

No menu `Tools`, selecione conforme sua placa:

**ESP32-C3 SuperMini:**
- **Board**: `ESP32C3 Dev Module`
- **USB CDC On Boot**: `Enabled`

**ESP32 WROOM / DevKit:**
- **Board**: `ESP32 Dev Module`

Em ambos os casos:
- **Port**: Selecione a porta onde seu ESP32 está conectado.

## ⚙️ Configuração do Wi-Fi

1. Abra o arquivo `eco-dispenser/secrets.h` no Arduino IDE (ele aparece como uma aba ao lado do .ino).
2. Insira seu SSID e Senha do Wi-Fi.

## 🚀 Gravação

1. Clique no botão de **Seta para a Direita** (Upload).
2. Se estiver no Linux e der erro de permissão, abra seu terminal e rode:  
   `sudo usermod -a -G dialout $USER` (relogue no sistema para aplicar).
3. Após o upload, abra o **Serial Monitor** (115200 baud).
4. O ESP aguardará 5s para você abrir o monitor e então exibirá o **IP: 192.168.x.x**.

## 🔍 Verificação

```bash
# Ver status direto no ESP
curl http://[IP_DO_ESP]/status

# Guia completo de testes (ESP32-C3, hardware + integração)
# Ver GUIA_TESTES_ESP32_C3.md
./scripts/verificar-status.sh [IP_DO_ESP]
```

## 🧪 Guia de testes (ESP32-C3 Mini)

Para validar firmware, hardware e dispensação sequencial (posições 1–21), siga o guia passo a passo:

**[GUIA_TESTES_ESP32_C3.md](GUIA_TESTES_ESP32_C3.md)**

Scripts auxiliares em `scripts/`:

| Script | Fase | Descrição |
|--------|------|-----------|
| `verificar-status.sh` | 0 | Boot + GET /status |
| `test-sequencia-manual.sh` | 4 | Sequência manual posições 1→2→3 |
| `criar-schedule-teste.sh` | 5 | Criar schedule via API para teste do scheduler |

Testes automatizados: [`tests/README.md`](tests/README.md)
