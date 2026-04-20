# 🔌 Firmware — ESP32-C3

Este diretório contém o código para o **ESP32-C3 SuperMini**. A gravação **deve ser feita manualmente via Arduino IDE**.

https://randomnerdtutorials.com/getting-started-esp32-c3-super-mini/

## 📋 Configuração do Arduino IDE

Para compilar este projeto, você deve configurar seu ambiente seguindo estes passos:

### 1. Adicionar Placa ESP32

1. Vá em `File > Preferences`.
2. Em `Additional Board Manager URLs`, adicione:  
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. Vá em `Tools > Board > Boards Manager`.
4. Procure por `esp32` (da Espressif Systems).
5. **CRÍTICO**: Selecione a versão **2.0.17** e clique em Install. (A versão 3.x causa erros de compilação com bibliotecas assíncronas).

### 2. Instalar Bibliotecas (Manual)

Vá em `Sketch > Include Library > Manage Libraries...` e instale:

1. **ESPAsyncWebServer** (autor: me-no-dev ou ESP32Async).
2. **AsyncTCP** (autor: me-no-dev ou ESP32Async).

### 3. Configurações de Upload

No menu `Tools`, selecione:

- **Board**: `ESP32C3 Dev Module`
- **USB CDC On Boot**: `Enabled`
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
```
