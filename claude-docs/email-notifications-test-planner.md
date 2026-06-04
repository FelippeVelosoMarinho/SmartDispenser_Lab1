# Plano de Testes: Notificações via E-mail

## 1. Objetivo

Validar ponta a ponta o envio de e-mails do Smart Dispenser — desde a conectividade SMTP até cada gatilho de negócio (cadastro, ingestão, falha, estoque) — confirmando que as preferências do cuidador são respeitadas.

---

## 2. Estado Atual da Implementação

| Componente | Arquivo | Status |
|------------|---------|--------|
| Config SMTP | `backend/app/core/config.py` | Gmail via `APP_PASSWORD_GOOGLE` |
| Serviço de envio | `backend/app/services/notifier.py` | `smtplib` + TLS, roda em `BackgroundTasks` |
| Templates HTML | `backend/app/services/templates.py` | 4 templates premium |
| Preferência do cuidador | `users.notifications_enabled` | `PATCH /api/auth/profile` |
| Script CLI de teste | `backend/tests/test_smtp.py` | Envio manual de boas-vindas |
| Testes unitários | `backend/tests/` | 26 testes (mock SMTP nos unitários) |

Relatório consolidado: `claude-docs/notifier_verification_report.md`.

---

## 3. Mapa de Gatilhos de E-mail

| ID | Gatilho | Rota | Condição | Template |
|----|---------|------|----------|----------|
| **E1** | Boas-vindas | `POST /api/auth/register` | e-mail válido no cadastro | `get_welcome_email_template` |
| **E2** | Ingestão confirmada | `POST /api/event` | `success=true` + caregiver com notificações ON | `get_dispensation_success_template` |
| **E3** | Dose não tomada | `POST /api/event` | `success=false` | `get_dispensation_failure_template` |
| **E4** | Estoque crítico | `POST /api/heartbeat` | transição `critical_stock: false→true` | `get_critical_stock_template` |

Todos os gatilhos IoT verificam:

```python
if caregiver_user and caregiver_user.notifications_enabled and caregiver_user.email:
```

---

## 4. Pré-requisitos

- [ ] **P1.** Arquivo `backend/.env` com:
  ```env
  APP_PASSWORD_GOOGLE=<senha_de_app_gmail>
  SMTP_USER=smart.dispenser.ufmg@gmail.com   # ou conta configurada
  EMAIL_FROM=Smart Dispenser <smart.dispenser.ufmg@gmail.com>
  ```
- [ ] **P2.** Senha de app Google ativa (2FA habilitado na conta).
- [ ] **P3.** E-mail de teste acessível (seu e-mail pessoal ou alias de lab).
- [ ] **P4.** Backend rodando (`docker compose up` ou `uvicorn`).
- [ ] **P5.** Para E2–E5: dispenser pareado com paciente cujo `caregiver_username` aponta para usuário com e-mail e `notifications_enabled=true`.

---

## 5. Plano de Testes

### Fase A — Conectividade SMTP (5 min)

- [ ] **A1.** Verificar variáveis carregadas:
  ```bash
  cd backend
  python3 -c "from app.core import config; print(config.SMTP_PASSWORD and 'OK' or 'MISSING')"
  ```
- [ ] **A2.** Script interativo:
  ```bash
  cd backend
  python3 tests/test_smtp.py
  ```
  Informar seu e-mail → receber template de boas-vindas.
- [ ] **A3.** Checar **caixa de entrada e spam**. Assunto esperado: `🧪 Teste de Conectividade SMTP - Smart Dispenser`.

**Critério:** e-mail recebido em < 30 s; logs do backend mostram `✅ Notifier: E-mail enviado com sucesso`.

---

### Fase B — Cadastro (E1)

- [ ] **B1.** Registrar novo cuidador via API ou frontend com e-mail real:
  ```bash
  curl -X POST http://localhost:8000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"test_cuidador","password":"senha123","email":"seu@email.com","full_name":"Teste Lab"}'
  ```
- [ ] **B2.** Confirmar e-mail de boas-vindas (template teal, credenciais).

---

### Fase C — Eventos de dispensa (E2, E3)

Setup: paciente vinculado ao dispenser; token JWT do cuidador.

- [ ] **C1. Sucesso (E2)** — simular confirmação pelo hardware:
  ```bash
  curl -X POST http://localhost:8000/api/event \
    -H "Content-Type: application/json" \
    -d '{
      "dispenser_id": "<MAC_DO_ESP>",
      "patient_id": "<UUID_PACIENTE>",
      "event_type": "dispensed",
      "success": true,
      "medication_id": "1"
    }'
  ```
  Assunto esperado: `🟢 SmartDispenser: Ingestão de ... confirmada`

- [ ] **C2. Falha (E3)** — simular dose não confirmada:
  ```bash
  curl -X POST http://localhost:8000/api/event \
    -H "Content-Type: application/json" \
    -d '{
      "dispenser_id": "<MAC_DO_ESP>",
      "patient_id": "<UUID_PACIENTE>",
      "event_type": "missed",
      "success": false,
      "error_message": "Paciente não confirmou em 30 min"
    }'
  ```
  Assunto esperado: `⚠️ Alerta SmartDispenser: Medicação NÃO confirmada...`

- [ ] **C3.** Verificar no banco: `dispensation_logs.caregiver_notified = true`.

---

### Fase D — Heartbeat alertas (E4)

> **Nota:** O firmware envia `critical_stock=false` fixo. Estes testes usam **curl manual** para simular transições.

- [ ] **D1. Estoque crítico (E4)** — duas chamadas sequenciais:
  ```bash
  # Estado inicial: critical_stock=false (default ou heartbeat anterior)
  curl -X POST http://localhost:8000/iot/heartbeat \
    -H "Content-Type: application/json" \
    -d '{"dispenser_id":"<MAC>","critical_stock":false,"online":true}'

  # Transição → true (dispara e-mail)
  curl -X POST http://localhost:8000/iot/heartbeat \
    -H "Content-Type: application/json" \
    -d '{"dispenser_id":"<MAC>","critical_stock":true,"online":true}'
  ```
  Assunto: `📦 Alerta SmartDispenser: Estoque crítico...`

- [ ] **D2.** Repetir D1 com `critical_stock` já true → **não** deve reenviar (só transição).

---

### Fase E — Preferências do cuidador

- [ ] **E1.** Desabilitar notificações:
  ```bash
  curl -X PATCH http://localhost:8000/api/auth/profile \
    -H "Authorization: Bearer <TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"notifications_enabled": false}'
  ```
- [ ] **E2.** Repetir C1 (evento success) → **nenhum** e-mail deve chegar.
- [ ] **E3.** Reabilitar `notifications_enabled: true` e confirmar que E2 volta a funcionar.

---

### Fase F — Testes automatizados (regressão)

- [ ] **F1.** Suite completa:
  ```bash
  cd backend
  python3 -m pytest -v
  ```
- [ ] **F2.** Todos os 26+ testes passando (SMTP mockado nos unitários).

---

## 6. Matriz de Resultados (preencher durante execução)

| ID | Teste | Enviado? | Recebido? | Spam? | Logs OK? | Notas |
|----|-------|----------|-----------|-------|----------|-------|
| A | SMTP CLI | | | | | |
| E1 | Boas-vindas | | | | | |
| E2 | Ingestão OK | | | | | |
| E3 | Dose falha | | | | | |
| E4 | Estoque crítico | | | | | |
| E | Pref. OFF bloqueia | | | | | |

---

## 7. Problemas Comuns e Diagnóstico

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| `APP_PASSWORD_GOOGLE não configurada` | `.env` ausente ou vazio | Copiar `.env.example`, gerar senha de app Google |
| `Authentication failed` | Senha de app revogada | Regenerar em myaccount.google.com/apppasswords |
| E-mail não chega, logs OK | Spam / delay Gmail | Checar spam; aguardar 1–2 min |
| E4 nunca dispara do ESP real | Valor hardcoded no firmware | Usar curl (Fase D) ou implementar telemetria real |
| E2/E3 sem e-mail | Paciente sem caregiver / notificações OFF | Verificar pareamento e `notifications_enabled` |
| Duplicatas de alerta | Múltiplas transições | Backend só dispara na **borda** false→true |

---

## 8. Critérios de Conclusão

- [ ] Fase A (SMTP) passou com e-mail real recebido.
- [ ] Pelo menos E2 e E3 validados com paciente/cuidador reais no ambiente de lab.
- [ ] E4 validado via simulação curl (até firmware reportar valores reais).
- [ ] Preferência `notifications_enabled=false` bloqueia envio (Fase E).
- [ ] `pytest` verde.
- [ ] Matriz da seção 6 preenchida e anexada ao relatório de lab.

---

## 9. Próximos Passos (pós-teste)

1. Implementar leitura real de `critical_stock` no firmware para E4 funcionar sem simulação.
2. Garantir que o ESP envia `POST /api/event` após confirmação do paciente (hoje só local em `buttons.cpp`).
3. Adicionar teste de integração E2E com SMTP de sandbox (Mailhog) no CI, se desejado.

---

## 10. Referências

- `backend/app/services/notifier.py`
- `backend/app/services/templates.py`
- `backend/app/api/endpoints/iot.py`
- `backend/app/api/endpoints/auth.py`
- `backend/tests/test_smtp.py`
- `claude-docs/notifier_implementation_plan.md`
- `claude-docs/notifier_verification_report.md`
