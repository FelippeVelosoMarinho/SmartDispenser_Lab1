# Plano de Verificação: Heartbeat Periódico vs Liberação de Bandejas

## 1. Objetivo

Entender o que o heartbeat periódico faz hoje, se ele está acoplado (ou deveria estar) à liberação das pílulas/bandejas, qual payload trafega de fato, e se faz sentido manter o envio a cada 30 s ou migrar para um modelo orientado a eventos.

---

## 2. Estado Atual (mapeado no código)

### 2.1 Onde o heartbeat roda

| Camada | Arquivo | Comportamento |
|--------|---------|---------------|
| Firmware | `firmware/eco-dispenser/eco-dispenser.ino` | Envia `POST {BACKEND_URL}/iot/heartbeat` a cada **30 s** (`HEARTBEAT_INTERVAL_MS`) e também após reconexão Wi-Fi |
| Backend | `backend/app/api/endpoints/iot.py` → `process_heartbeat` | Atualiza status do dispenser no banco e dispara e-mails de estoque crítico |
| Dashboard | `backend/app/crud/dispenser.py` | Marca dispenser **offline** se `last_sync` > **15 min** sem heartbeat |

### 2.2 Payload enviado pelo ESP32 (firmware)

```json
{
  "dispenser_id": "<MAC WiFi>",
  "uptime_s": 1234,
  "current_slot": 3,
  "wifi_rssi": -55,
  "online": true,
  "critical_stock": false,
  "ip_address": "192.168.x.x"
}
```

> **Observação:** `critical_stock` está **hardcoded** no firmware (`false`). O alerta de estoque crítico via heartbeat **não dispara** com o hardware atual. O dispositivo é alimentado por fonte — telemetria de bateria foi removida do sistema.

### 2.3 Payload aceito pelo backend (`HeartbeatCreate`)

Campos válidos: `dispenser_id`, `online`, `critical_stock`, `ip_address`.

Campos extras do firmware (`uptime_s`, `current_slot`, `wifi_rssi`) são **ignorados** pelo Pydantic — não persistem no banco.

### 2.4 O que o backend persiste a cada heartbeat

Em `crud_dispenser.update_dispenser_status`:

- `is_online` ← sempre `true` enquanto o ESP envia
- `critical_stock`
- `ip_address` (se presente)
- `last_sync` ← timestamp usado pelo dashboard ("último contato")

**Não atualiza:** `current_slot`, RSSI, uptime.

### 2.5 Como as pílulas/bandejas são liberadas (fluxo separado)

O heartbeat **não** avança a roleta nem solta bandeja. A liberação física ocorre por outro caminho:

```
Backend (ou teste manual)
    POST http://<ESP32_IP>/dispense
        body: {"period": "morning"|"afternoon"|"night", "silent_mode": true|false}
            ↓
    advanceCarousel()        → servo avança 1 slot (0–20)
    triggerDispenseAlert()   → LED do período + buzzer/vibração
            ↓
    Paciente pressiona BTN_CONFIRM
            ↓
    lastConfirmedSlot atualizado (local no ESP)
```

Agendamentos existem no backend (`GET /api/sync/{hardware_id}`), mas **o firmware ainda não baixa nem executa horários offline** — não há cron/RTC no ESP que dispare `/dispense` sozinho.

---

## 3. Perguntas a Responder na Verificação

| # | Pergunta | Resposta esperada após testes |
|---|----------|-------------------------------|
| 1 | O heartbeat dispara a cada 30 s com Wi-Fi estável? | Serial: `[Heartbeat] 200 ← ...` |
| 2 | O heartbeat avança slot ou libera bandeja? | **Não** — slot só muda via `POST /dispense` |
| 3 | `current_slot` no heartbeat reflete a roleta real? | Sim no JSON enviado, mas backend **descarta** |
| 4 | Dashboard mostra "conectado" graças ao heartbeat? | Sim — `last_sync` e `is_online` |
| 5 | Alertas de estoque crítico funcionam? | **Não** — valor fixo no firmware |
| 6 | Horários de liberação estão definidos onde? | Backend (`schedules` table) + endpoint `/sync`; ESP não consome ainda |

---

## 4. Plano de Testes

### Fase A — Observabilidade do heartbeat (15 min)

- [ ] **A1.** Subir backend + ESP32 na mesma rede; confirmar `BACKEND_URL` em `secrets.h`.
- [ ] **A2.** Monitorar Serial Monitor por 3 ciclos (~90 s): confirmar intervalo de 30 s e HTTP 200.
- [ ] **A3.** Capturar um POST com Wireshark/curl mirror ou log do backend:
  ```bash
  # Consultar status após heartbeat
  curl -s http://localhost:8000/api/dispensers/<MAC> | jq '.last_sync, .is_online'
  ```
- [ ] **A4.** Desligar Wi-Fi do ESP por 20 min → dashboard deve marcar **desconectado** (timeout 15 min).
- [ ] **A5.** Reconectar Wi-Fi → heartbeat imediato (~1 s após reconexão) e status volta a conectado.

### Fase B — Isolar liberação de bandeja (10 min)

- [ ] **B1.** Anotar `current_slot` via `GET http://<ESP32_IP>/status`.
- [ ] **B2.** Aguardar 2 heartbeats (~60 s) **sem** chamar `/dispense`.
- [ ] **B3.** Confirmar que `current_slot` **não mudou** (heartbeat não move roleta).
- [ ] **B4.** `POST /dispense` com `{"period":"morning","silent_mode":false}`.
- [ ] **B5.** Confirmar slot incrementou, LED manhã aceso, buzzer tocou.
- [ ] **B6.** Verificar se algum heartbeat posterior enviou o novo `current_slot` (sim no wire, não no DB).

### Fase C — Contrato firmware ↔ backend (5 min)

- [ ] **C1.** Enviar heartbeat manual sem campos extras e comparar resposta:
  ```bash
  curl -X POST http://localhost:8000/iot/heartbeat \
    -H "Content-Type: application/json" \
    -d '{"dispenser_id":"<MAC>","online":true,"critical_stock":false,"ip_address":"192.168.1.10"}'
  ```
- [ ] **C2.** Documentar campos "fantasma" (`uptime_s`, `current_slot`, `wifi_rssi`) como candidatos a remoção ou extensão do schema.

---

## 5. Análise: Heartbeat periódico vs evento de liberação

### O que o heartbeat periódico **justifica hoje**

| Função | Precisa ser periódica? |
|--------|------------------------|
| Manter `is_online` / `last_sync` no dashboard | **Sim** — detecção de queda |
| Atualizar `ip_address` (DHCP) | Sim, eventual |
| Alertas de estoque crítico | Sim, mas **requer leitura real no firmware** |
| Saber slot atual da roleta | Não — muda só em `/dispense` |

### O que deveria ser **orientado a evento**

| Evento | Endpoint sugerido | Payload mínimo |
|--------|-------------------|----------------|
| Bandeja liberada | `POST /api/event` (já existe) ou novo `dispensed` | `dispenser_id`, `schedule_id`, `slot_id`, `period` |
| Paciente confirmou ingestão | `POST /api/event` success=true | já mapeado |
| Dose não confirmada (timeout) | `POST /api/event` success=false | já mapeado |
| Slot avançou | opcional, junto com dispense | `current_slot` |

### Recomendação arquitetural (pós-verificação)

1. **Manter heartbeat periódico** (intervalo configurável, ex.: 60–120 s) apenas para telemetria de **presença** (`online`, `last_sync`, `ip`, RSSI).
2. **Não usar heartbeat para slot** — enviar `current_slot` no evento de dispense/confirmação ou estender schema se o dashboard precisar.
3. **Implementar no firmware** (fase futura):
   - Download de horários via `GET /api/sync/{mac}`
   - Timer local (NTP + cron) para chamar `advanceCarousel()` nos horários
   - Contagem de slots vazios → `critical_stock`
4. **Reduzir frequência** se 30 s for excessivo para lwIP (risco de crash TCP já documentado em `DEPENDENCIES.md`).

---

## 6. Critérios de Conclusão

- [ ] Documento de fluxo heartbeat vs dispense validado com evidências (logs + screenshots dashboard).
- [ ] Tabela de campos: o que o ESP envia × o que o backend usa × o que o frontend exibe.
- [ ] Decisão registrada: manter/adjustar intervalo do heartbeat e lista de campos.
- [ ] Backlog criado para: telemetria real de estoque, sync de horários no ESP, evento pós-dispense.

---

## 7. Referências no Repositório

- `firmware/eco-dispenser/eco-dispenser.ino` — `sendHeartbeat()`, loop 30 s
- `firmware/eco-dispenser/config.h` — `HEARTBEAT_INTERVAL_MS`
- `firmware/eco-dispenser/api_server.cpp` — `POST /dispense`
- `firmware/eco-dispenser/carousel.cpp` — avanço da roleta
- `backend/app/api/endpoints/iot.py` — heartbeat, sync, event
- `backend/app/schemas/iot.py` — `HeartbeatCreate`
- `backend/app/crud/dispenser.py` — timeout offline 15 min
