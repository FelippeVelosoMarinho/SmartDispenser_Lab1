# Módulo — Firmware (ESP32-C3)

## Papel

Firmware em **C++/Arduino** rodando no **ESP32-C3 SuperMini**: servidor HTTP assíncrono, controle de hardware (carrossel, botões, alertas, LED) e integração com o backend como cliente/proxy de IoT.

## Execução

**Não há imagem Docker.** O fluxo é:

1. Configurar Wi-Fi em `firmware/eco-dispenser/secrets.h`.
2. Abrir o sketch no **Arduino IDE**, instalar core ESP32 (**2.0.17** recomendado no README do firmware) e bibliotecas (**ESPAsyncWebServer**, **AsyncTCP**).
3. Compilar e gravar na placa; ler o IP no monitor serial (**115200** baud).

Instruções detalhadas: `firmware/README.md`.

## Integração com o backend

O backend resolve `ESP32_BASE_URL = http://{ESP32_IP}` e chama endpoints HTTP no firmware (por exemplo **`GET /status`** para health e estado do LED).

Requisitos práticos:

- ESP e máquina que roda o backend na **mesma rede** alcançável (mesmo Wi-Fi, sem isolamento de cliente/AP).
- **`ESP32_IP`** no `docker-compose.yml` (serviço `backend`) ou `backend/.env` deve coincidir com o IP atual do ESP.

## Verificação manual

```bash
curl http://[IP_DO_ESP]/status
```

## Integração

Arquitetura completa: [`INTEGRACAO.md`](INTEGRACAO.md).
