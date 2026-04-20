# 🌿 Eco-Dispenser Inteligente — MVP POC

Possíveis nomes:
- [ ] Zé droguinha
- [ ] ajuda ai gnt...

Sistema de monitoramento e controle em tempo real para dispensers inteligentes, integrando Hardware (ESP32-C3), Backend (FastAPI) e Frontend (React).

## 🏗️ Arquitetura do Monorepo

Este projeto utiliza uma estrutura de monorepo organizada para facilitar o desenvolvimento simultâneo:

```text
.
├── firmware/         # Código C++ para ESP32-C3 (Arduino IDE)
├── backend/          # Servidor Proxy em FastAPI (Python)
├── frontend/         # Dashboard em React + Vite (TS)
└── biome.json        # Configuração de Lint/Format (Biome)
```

## 🚀 Como Iniciar (Ordem Recomendada)

### 1. Hardware (Firmware)

O cérebro do sistema. Ele precisa estar na rede para que o resto funcione.

1. Abra o arquivo `firmware/eco-dispenser/eco-dispenser.ino` no **Arduino IDE**.
2. Siga as instruções de instalação de bibliotecas no [README do Firmware](firmware/README.md).
3. Faça o upload e pegue o IP no Monitor Serial.

### 2. Backend (Proxy)

A ponte de comunicação.

1. Configure o IP do ESP no arquivo `backend/.env`.
2. Siga o [README do Backend](backend/README.md) para iniciar o servidor.

### 3. Frontend (Dashboard)

A interface do usuário.

1. Siga o [README do Frontend](frontend/README.md) para iniciar o servidor Vite.
2. Abra `http://localhost:5173` no navegador.

---

## 🛠️ Resumo de Soluções (Troubleshooting)

Durante o desenvolvimento deste POC, resolvemos desafios críticos:

- **Arduino**: Uso da versão **2.0.17** do Core ESP32 no Boards Manager.
- **Linux**: Permissões de USB via grupo `dialout` (`sudo usermod -a -G dialout $USER`).
- **Rede**: Uso de `127.0.0.1` no proxy do Vite para evitar conflitos de IPv6.
- **JSON**: O firmware agora processa JSON manualmente para evitar erros de versão da biblioteca `ArduinoJson`.
