# Teste de Validação de Integração — Frontend ↔ Backend ↔ Database

> **Como usar este documento:** percorra cada seção na ordem. Cada item tem:
> - **Como validar** — comando ou ação concreta
> - **Esperado** — saída esperada
> - **Se falhar** — diagnóstico + correção sugerida
>
> Marque `[x]` quando passar. Se um item falhar e a correção for aplicada, refaça a validação.
>
> Fonte: [`claude-docs/`](claude-docs/) + inspeção do código.
> Última atualização: 2026-05-13

---

## 0. Como rodar via Docker (pré-requisito)

```bash
# Subir tudo em modo dev (db + backend + frontend-dev com HMR)
docker compose --profile dev up --build

# Modo produção (Nginx servindo build estático)
docker compose --profile prod up --build

# Apenas API + banco (sem frontend)
docker compose up --build
```

| Serviço | URL host | Observação |
|---|---|---|
| Frontend dev | http://localhost | container 5173 → host 80 |
| Backend | http://localhost:8000 | |
| Swagger | http://localhost:8000/docs | |
| Postgres | localhost:5433 | user/password/smart_dispenser |

> Conferir antes: `services.backend.environment.ESP32_IP` no `docker-compose.yml` (apenas se for testar rotas IoT).

---

## 1. Validação de fundação (infra)

### 1.1 Stack sobe limpa
- **Como validar:** `docker compose --profile dev up --build -d && docker compose ps`
- **Esperado:** três containers `Up` — `smart_dispenser_db`, `smart_dispenser_backend`, `smart_dispenser_frontend_dev`
- **Se falhar:**
  - Container `db` em loop → volume `postgres_data` corrompido → `docker compose --profile dev down -v` (perde dados) e subir de novo
  - Container `backend` falha no start → `docker compose logs backend` e checar import error / `DATABASE_URL`
  - Conflito de porta `:80` → outro processo no host usando essa porta → liberar ou alterar mapeamento

- [ ] **Passou**

### 1.2 Banco populado com `init.sql`
- **Como validar:**
  ```bash
  docker compose exec db psql -U user -d smart_dispenser -c "\dt"
  ```
- **Esperado:** tabelas listadas: `patients`, `caregivers`, `patient_caregiver`, `dispensers`, `drawers`, `slots`, `medications`, `schedules`, `dispensation_logs`, `refill_history`
- **Se falhar:**
  - Lista vazia → `init.sql` não executou (volume já existia) → `docker compose --profile dev down -v && docker compose --profile dev up --build`
  - Tabela faltando → diff entre `database/init.sql` e o que rodou → revisar SQL

- [ ] **Passou**

### 1.3 Swagger disponível
- **Como validar:** abrir http://localhost:8000/docs
- **Esperado:** Swagger UI com routers `auth`, `iot`, `patients`, `medications`, `schedules`, `logs`, `dispensers`
- **Se falhar:**
  - 404 → app não montou os routers → checar `app/api/api.py`
  - Conexão recusada → backend não subiu → `docker compose logs backend`

- [ ] **Passou**

### 1.4 Frontend dev renderiza
- **Como validar:** abrir http://localhost e DevTools › Network
- **Esperado:** página de login renderiza; chamadas para `/api/*` retornam 200/401 (não CORS error nem 404)
- **Se falhar:**
  - Tela branca → checar console do navegador
  - Chamadas `/api/*` falham com 502/504 → proxy do Vite errado → conferir `VITE_API_URL=http://smart_dispenser_backend:8000` no compose
  - CORS error → `CORS_ORIGINS` no backend não inclui a origem → adicionar em `app/core/config.py`

- [ ] **Passou**

---

## 2. Validação de Auth

### 2.1 Registro de cuidador
- **Como validar:**
  ```bash
  curl -s -X POST http://127.0.0.1:8000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","password":"secret123","full_name":"Alice","email":"alice@ex.com"}' | jq
  ```
- **Esperado:** HTTP 201 + body `{"username":"alice","full_name":"Alice","email":"alice@ex.com"}`
- **Se falhar:**
  - 400 "Username already registered" → ok, usar outro username
  - 422 → schema diferente do esperado → checar `app/schemas/user.py` (`UserCreate`)
  - 500 → backend quebrou → `docker compose logs backend`

- [ ] **Passou**

### 2.2 Persistência do usuário no Postgres
- **Como validar:**
  ```bash
  docker compose exec db psql -U user -d smart_dispenser \
    -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users','caregivers');"
  docker compose exec db psql -U user -d smart_dispenser \
    -c "SELECT * FROM caregivers LIMIT 5;"  # ou users, conforme o modelo
  ```
- **Esperado:** registro do usuário recém-criado aparece
- **Se falhar (CRÍTICO):** se nenhuma tabela tem o registro → `crud/user.py` está usando armazenamento em memória → **corrigir antes de continuar**:
  1. Adicionar model SQLAlchemy de `User` em `app/models/domain.py` (ou usar `caregivers`)
  2. Reescrever `app/crud/user.py` para usar a sessão do banco
  3. Garantir `Base.metadata.create_all` no lifespan ou usar Alembic

- [ ] **Passou**

### 2.3 Login retorna token
- **Como validar:**
  ```bash
  curl -s -X POST http://127.0.0.1:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","password":"secret123"}' | jq
  ```
- **Esperado:** HTTP 200 + `{"access_token":"<jwt>","token_type":"bearer"}`
- **Se falhar:**
  - 400 "Incorrect username or password" → senha não bateu → `verify_password` pode estar quebrado ou hash não foi salvo
  - 500 → `JWT_SECRET` ausente → setar em `app/core/config.py` ou env

- [ ] **Passou**

### 2.4 Token autoriza acesso
- **Como validar:**
  ```bash
  TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","password":"secret123"}' | jq -r .access_token)
  curl -s http://127.0.0.1:8000/api/auth/profile -H "Authorization: Bearer $TOKEN" | jq
  ```
- **Esperado:** HTTP 200 + perfil do `alice`
- **Se falhar:**
  - 401 "Could not validate credentials" → `JWT_SECRET` divergente entre criação e validação, ou algoritmo errado
  - 401 sem token → `get_current_user` não está sendo aplicado como `Depends`

- [ ] **Passou**

### 2.5 Frontend usa auth real (não mock)
- **Como validar:** abrir `frontend/src/auth/AuthContext.tsx` e procurar pela string `"sessionStorage"` e por `fetch(`
- **Esperado:** `login` faz `fetch("/api/auth/login", ...)` e salva o `access_token` retornado
- **Se falhar (estado atual conhecido):**
  - `AuthContext` está mockado (sem fetch). **Correção:**
    1. Criar `frontend/src/lib/apiClient.ts` que injeta `Authorization: Bearer ${token}` lendo de `sessionStorage`
    2. Criar `frontend/src/services/authService.ts` com `register`, `login`, `profile`
    3. Reescrever `AuthContext.tsx` para chamar `authService.login(username, password)` e armazenar o token
    4. `LoginPage.tsx`: trocar input `email` por `username` (alinhar com `LoginRequest`)
    5. 401 do `apiClient` → limpar token + redirecionar para `/login`

- [ ] **Passou**

---

## 3. Validação de Pacientes (CRUD)

### 3.1 Backend — listagem com escopo do cuidador
- **Como validar:**
  ```bash
  curl -s http://127.0.0.1:8000/api/patients -H "Authorization: Bearer $TOKEN" | jq
  ```
- **Esperado:** HTTP 200 + array (vazio é OK se o cuidador não tem pacientes)
- **Se falhar:**
  - 500 → `get_patients_by_caregiver` quebrou — checar query no `crud/patient.py`
  - Retorna pacientes de outro cuidador → vazamento de escopo, **bug de segurança**: validar filtro `caregiver_username` no CRUD

- [ ] **Passou**

### 3.2 Backend — criação com validação
- **Como validar:**
  ```bash
  # Caso válido
  curl -s -X POST http://127.0.0.1:8000/api/patients \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"full_name":"João","tax_id":"12345678901","birth_date":"1980-01-15","phone":"+55 11 90000-0000","email":"joao@ex.com"}' | jq

  # Caso inválido — tax_id ausente
  curl -s -X POST http://127.0.0.1:8000/api/patients \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"full_name":"João"}' -w "\nHTTP %{http_code}\n"

  # Caso inválido — email malformado
  curl -s -X POST http://127.0.0.1:8000/api/patients \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"full_name":"João","tax_id":"x","email":"nao-eh-email"}' -w "\nHTTP %{http_code}\n"
  ```
- **Esperado:** caso válido 201; casos inválidos **422 com detalhe Pydantic**
- **Se falhar:**
  - Caso inválido retorna 200/201 → `PatientCreate` não está validando — adicionar:
    - `tax_id: str = Field(min_length=11)` (ou regex de CPF)
    - `email: EmailStr | None = None`
    - `birth_date: date | None = None`
    - `full_name: str = Field(min_length=2)`
  - Caso válido falha por unique violation → `tax_id` já existe — usar outro

- [ ] **Passou**

### 3.3 Backend — autorização por dono
- **Como validar:** criar segundo cuidador `bob`, fazer login com ele, tentar acessar paciente criado por `alice`:
  ```bash
  curl -s http://127.0.0.1:8000/api/patients/<patient_id> -H "Authorization: Bearer $BOB_TOKEN" -w "\nHTTP %{http_code}\n"
  ```
- **Esperado:** HTTP 403 "Not authorized to access this patient"
- **Se falhar:**
  - 200 → vazamento de autorização. Conferir guardas em `app/api/endpoints/patients.py` (`patient["caregiver_username"] != current_user["username"]`)

- [ ] **Passou**

### 3.4 Frontend — `PatientsPage` consome backend
- **Como validar:**
  ```bash
  grep -n "MOCK_PATIENTS" frontend/src/pages/PatientsPage.tsx
  ```
- **Esperado:** **nenhuma ocorrência** (mock removido)
- **Se falhar (estado atual conhecido):** mock ainda existe. **Correção:**
  1. Criar `frontend/src/services/patientService.ts` (`list`, `create`, `getById`, `update`)
  2. Em `PatientsPage`: usar `useEffect` (ou TanStack Query) chamando `patientService.list()`
  3. Mapear `full_name → nome`, derivar `idade` de `birth_date`
  4. Remover campo "status ativo/inativo" (não existe no schema) ou abrir issue para adicionar
  5. Estado de loading + estado de erro tratados na UI

- [ ] **Passou**

### 3.5 Frontend — validação de campos no formulário
- **Como validar:** abrir `AddPatientPage` no browser, submeter formulário com:
  - Campos vazios → cada campo obrigatório deve mostrar erro inline
  - `tax_id` com menos de 11 dígitos → erro "CPF inválido"
  - `email` malformado → erro "Email inválido"
  - `birth_date` no futuro → erro "Data não pode ser futura"
- **Esperado:** submit é bloqueado e mensagens aparecem nos respectivos inputs (componente `Input` já tem prop `error`)
- **Se falhar:**
  - Sem validação no frontend. **Correção:** adicionar validação client-side espelhando o schema Pydantic. Sugestão: usar Zod + react-hook-form (ou validação manual com `useState<Errors>` como já existe em `PatientMedicationsPage.tsx:148-154`)
  - Frontend valida mas backend aceita lixo → reforçar Pydantic conforme 3.2

- [ ] **Passou**

### 3.6 Frontend — feedback de erro do backend
- **Como validar:** com DevTools › Network, criar paciente com `tax_id` duplicado
- **Esperado:** toast/alert com mensagem do backend; formulário não fecha; usuário pode corrigir
- **Se falhar:**
  - Erro silenciado → `apiClient` deve fazer `throw` em status >= 400 e a página capturar
  - Mensagem genérica em vez do `detail` da API → ler `await res.json().then(e => e.detail)`

- [ ] **Passou**

---

## 4. Validação de Medicamentos e Schedules

### 4.1 Backend — catálogo de medicamentos
- **Como validar:**
  ```bash
  # Criar
  curl -s -X POST http://127.0.0.1:8000/api/medications \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Ritalina","dosage_mg":10,"description":"Metilfenidato"}' | jq
  # Buscar
  curl -s "http://127.0.0.1:8000/api/medications?search=rita" -H "Authorization: Bearer $TOKEN" | jq
  ```
- **Esperado:** 201 na criação; busca retorna o medicamento criado (case-insensitive)
- **Se falhar:**
  - Busca não acha → `crud/medication.get_all_medications` provavelmente está fazendo `LIKE` case-sensitive — usar `ILIKE`
  - `dosage_mg` aceita negativo → adicionar `Field(gt=0)` em `MedicationCreate`

- [ ] **Passou**

### 4.2 Backend — criação de schedule respeita autorização
- **Como validar:**
  ```bash
  curl -s -X POST http://127.0.0.1:8000/api/schedules \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"patient_id":"<id-de-paciente-de-outro-cuidador>","slot_id":1,"medication_id":1,"scheduled_time":"08:00:00","pills_per_dose":1}' -w "\nHTTP %{http_code}\n"
  ```
- **Esperado:** HTTP 403
- **Se falhar:** guarda de `patient.caregiver_username` ausente — adicionar no endpoint `register_schedule`

- [ ] **Passou**

### 4.3 Backend — validação de campos do schedule
- **Como validar:** tentar criar schedule com:
  - `pills_per_dose: 0` → deve falhar (422)
  - `pills_per_dose: -1` → deve falhar (422)
  - `scheduled_time: "25:00:00"` → deve falhar (422)
  - `slot_id` que não existe → deve falhar (404 ou 422)
- **Esperado:** todos os casos rejeitados
- **Se falhar:**
  - Adicionar em `ScheduleCreate`:
    - `pills_per_dose: int = Field(ge=1)`
    - `scheduled_time: time` (Pydantic já valida formato)
  - FK violation → tratar erro de SQLAlchemy e retornar 400 amigável

- [ ] **Passou**

### 4.4 Frontend — `PatientMedicationsPage` integrada
- **Como validar:** `grep -n "MOCK_MEDICATIONS\|TODO: integrar" frontend/src/pages/PatientMedicationsPage.tsx`
- **Esperado:** zero ocorrências (atualmente há `TODO: integrar com backend quando o endpoint estiver disponível` em duas linhas)
- **Se falhar (estado atual conhecido):** página é toda mockada. **Correção:**
  1. Refatorar para os dois conceitos do backend:
     - Catálogo: `medicationService.list({ search })` com autocomplete
     - Vínculo: `scheduleService.create({ patient_id, slot_id, medication_id, scheduled_time, pills_per_dose })`
  2. Para a lista do paciente: `scheduleService.list({ patient_id })` + join com `medication`
  3. UX para `slot_id`: definir picker (depende da Fase 5 - Dispensadores)
  4. Validações client-side: nome (obrigatório), dosagem (>0), pelo menos um horário, `slot_id` selecionado

- [ ] **Passou**

---

## 5. Validação de Dispensadores

### 5.1 Backend — endpoint de listagem
- **Como validar:** `curl -s http://127.0.0.1:8000/api/dispensers -H "Authorization: Bearer $TOKEN"`
- **Esperado:** 200 + array
- **Se falhar (estado atual conhecido):** rota não existe. **Correção:**
  1. Adicionar em `app/api/endpoints/dispensers.py`:
     - `GET /api/dispensers` (lista por cuidador via `patients` do cuidador)
     - `POST /api/dispensers` (pareia `hardware_id` + `patient_id`)
     - `PATCH /api/dispensers/{id}` (atualiza)
     - `DELETE /api/dispensers/{id}` (remove)
  2. Implementar correspondentes em `app/crud/dispenser.py`
  3. Schemas em `app/schemas/dispenser.py`: `DispenserCreate`, `DispenserUpdate`, `DispenserPublic`

- [ ] **Passou**

### 5.2 Backend — telemetria
- **Como validar:** `curl -s http://127.0.0.1:8000/api/dispensers/<id>/status -H "Authorization: Bearer $TOKEN"`
- **Esperado:** 200 com `is_online`, `critical_stock`, etc.
- **Se falhar:** rota existe mas `get_dispenser_status` pode retornar mock — validar contra registro real no banco

- [ ] **Passou**

### 5.3 Backend — pareamento valida `hardware_id` único
- **Como validar:** parear o mesmo `hardware_id` duas vezes
- **Esperado:** segunda chamada retorna 409 ou 400 com mensagem clara
- **Se falhar:** capturar `IntegrityError` no CRUD e converter para HTTPException

- [ ] **Passou**

### 5.4 Frontend — `DispensersPage` integrada
- **Como validar:** `grep -n "MOCK_DISPENSERS" frontend/src/pages/DispensersPage.tsx`
- **Esperado:** zero
- **Se falhar (estado atual conhecido):** mock presente. **Correção:** após 5.1 estar pronto, usar `dispenserService.list()`

- [ ] **Passou**

### 5.5 Frontend — `PairDispenserPage` com validação
- **Como validar:** formulário de pareamento deve exigir:
  - `hardware_id` (formato MAC ou serial — regex)
  - `patient_id` selecionado de dropdown carregado via `patientService.list()`
- **Esperado:** submit bloqueado se campos inválidos; sucesso navega para `/dispensers`
- **Se falhar:** implementar validação espelhando schema do backend

- [ ] **Passou**

---

## 6. Validação de Logs e Dashboard

### 6.1 Backend — logs de dispensação retornam dados
- **Como validar:**
  ```bash
  curl -s "http://127.0.0.1:8000/api/logs/dispensation?patient_id=<id>" -H "Authorization: Bearer $TOKEN" | jq
  ```
- **Esperado:** 200 + array (vazio se sem histórico)
- **Se falhar:** checar query em `crud/log.get_dispensation_logs`; confirmar JOIN com `slots → drawers → dispensers → patients`

- [ ] **Passou**

### 6.2 Backend — autorização nos logs
- **Como validar:** mesmo teste, mas com `$BOB_TOKEN` e `patient_id` de `alice`
- **Esperado:** 403 ou array vazio (não dados alheios)
- **Se falhar (CRÍTICO):** vazamento. Adicionar checagem de `caregiver_username` antes de retornar

- [ ] **Passou**

### 6.3 Dashboard mostra dados reais
- **Como validar:** abrir `/dashboard` e verificar se há painel de últimas dispensações + status dos dispensers
- **Esperado:** dados reais + estado de loading + estado vazio
- **Se falhar (estado atual conhecido):** `DashboardPage.tsx` só tem controle de LED. **Correção:** adicionar widgets consumindo `logService.dispensation` e `dispenserService.list`

- [ ] **Passou**

### 6.4 LED continua funcional após mudanças
- **Como validar:** abrir `/dashboard`, clicar Ligar/Desligar
- **Esperado:** badge fica verde, latência aparece, LED responde
- **Se falhar:**
  - `backendReachable: false` → backend caiu
  - `hardware_reachable: false` → `ESP32_IP` errado ou ESP fora da rede
  - Latência > 1000ms → rede ou ESP sobrecarregado

- [ ] **Passou**

---

## 7. Validação de Segurança e Robustez

### 7.1 Endpoints protegidos rejeitam request sem token
- **Como validar:**
  ```bash
  for route in /api/patients /api/medications /api/schedules /api/logs/dispensation /api/dispensers/abc/status; do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000$route)
    echo "$route → $code"
  done
  ```
- **Esperado:** todos retornam 401
- **Se falhar:** algum endpoint sem `Depends(get_current_user)` — adicionar

- [ ] **Passou**

### 7.2 Token expirado é rejeitado
- **Como validar:** definir `ACCESS_TOKEN_EXPIRE_MINUTES=1` em `app/core/config.py`, gerar token, aguardar 2 min, chamar `/api/auth/profile`
- **Esperado:** 401
- **Se falhar:** `create_access_token` não está setando `exp` corretamente

- [ ] **Passou**

### 7.3 Senha é hasheada
- **Como validar:**
  ```bash
  docker compose exec db psql -U user -d smart_dispenser \
    -c "SELECT hashed_password FROM caregivers LIMIT 1;"  # ou users
  ```
- **Esperado:** string começando com `$2b$` (bcrypt)
- **Se falhar (CRÍTICO):** senha em texto claro. Conferir `get_password_hash` em `app/core/security.py`

- [ ] **Passou**

### 7.4 CORS configurado para o frontend
- **Como validar:**
  ```bash
  curl -s -I -X OPTIONS http://127.0.0.1:8000/api/patients \
    -H "Origin: http://localhost" \
    -H "Access-Control-Request-Method: GET"
  ```
- **Esperado:** header `access-control-allow-origin: http://localhost`
- **Se falhar:** adicionar `http://localhost` em `CORS_ORIGINS` (`app/core/config.py`)

- [ ] **Passou**

### 7.5 Frontend — token não vaza em URL ou logs
- **Como validar:** DevTools › Network, fazer login, conferir que `access_token`:
  - Não aparece em query string de nenhuma rota
  - Não aparece em `console.log`
  - Está apenas em header `Authorization`
- **Se falhar:** revisar `apiClient.ts` e remover logs

- [ ] **Passou**

### 7.6 Frontend — rota autenticada redireciona quando sem token
- **Como validar:** logout, tentar acessar `http://localhost/patients` direto
- **Esperado:** redireciona para `/login?redirect=/patients`
- **Se falhar:** `_authenticated` route guard em `router.tsx:42-48` quebrou — checar `context.auth.isAuthenticated`

- [ ] **Passou**

---

## 8. Validação de UX e qualidade

### 8.1 Estados de loading visíveis
- **Como validar:** em cada listagem (pacientes, dispensers, schedules), abrir página com rede lenta (DevTools › Throttling)
- **Esperado:** skeleton ou spinner aparece; não há tela em branco
- **Se falhar:** adicionar `isLoading` no service + estado vazio na UI

- [ ] **Passou**

### 8.2 Estado vazio é amigável
- **Como validar:** cuidador novo sem pacientes em `/patients`
- **Esperado:** ilustração/ícone + "Nenhum paciente cadastrado" + CTA "Adicionar paciente"
- **Já existe parcialmente** em `PatientsPage.tsx:177-200`

- [ ] **Passou**

### 8.3 Erros de rede não derrubam a UI
- **Como validar:** parar o backend (`docker compose stop backend`), abrir `/patients`
- **Esperado:** mensagem "Não foi possível carregar pacientes. Tentar novamente." com botão
- **Se falhar:** envolver chamadas em try/catch e renderizar fallback

- [ ] **Passou**

### 8.4 Confirmação antes de ações destrutivas
- **Como validar:** deletar paciente, schedule, dispenser
- **Esperado:** `ConfirmModal` (já existe) aparece e exige confirmação
- **Já existe** em `PatientsPage.tsx:276-288` para pacientes

- [ ] **Passou**

### 8.5 Lint e tipos
- **Como validar:**
  ```bash
  bun run lint
  bun run build:types --cwd frontend
  ```
- **Esperado:** zero erros
- **Se falhar:** corrigir antes de considerar a integração concluída

- [ ] **Passou**

---

## 9. Validação ponta a ponta (cenário real)

Execute o fluxo completo simulando um usuário novo:

1. [ ] Registrar cuidador novo via `/register` (criar essa rota se ainda não existir)
2. [ ] Logar em `/login` com username + senha
3. [ ] Cadastrar paciente em `/patients/new` com todos os campos válidos
4. [ ] Cadastrar medicamento via autocomplete
5. [ ] Parear dispenser em `/dispensers/pair` (após Fase 5)
6. [ ] Criar schedule vinculando paciente + slot + medicamento
7. [ ] Voltar ao dashboard e ver schedule listado
8. [ ] Editar paciente
9. [ ] Deletar schedule (com confirmação)
10. [ ] Logout — sessão limpa, redireciona para `/login`
11. [ ] Reload da página com sessão ativa — continua logado
12. [ ] Token expira → próxima ação leva para `/login`

Cada passo deve passar sem erros no console do navegador e sem 500 nos logs do backend.

---

## 10. Divergências documentadas

Lista mantida para próxima revisão dos docs:

- **Porta do frontend prod:** `claude-docs/INTEGRACAO.md` cita 8080; `docker-compose.yml` usa `80:80`. Decidir e padronizar.
- **`caregivers` (init.sql) vs `users` (auth):** alinhar nomenclatura — `app/models/domain.py` deve ser fonte da verdade.
- **`username` (API) vs `email` (UI no LoginPage):** padronizar para `username`.
- **Status "ativo/inativo" do paciente:** não existe no schema; remover da UI ou adicionar coluna.
- **Slots/drawers na UX:** não expostos no frontend mas necessários para `schedules` — definir wizard de configuração.

---

## Apêndice — Snippets reutilizáveis

### `apiClient.ts` (frontend, a criar)
```ts
const TOKEN_KEY = "pillar_token";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}
```

### Validação Pydantic (backend, exemplos)
```python
# app/schemas/patient.py
from datetime import date
from pydantic import BaseModel, EmailStr, Field

class PatientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    tax_id: str = Field(min_length=11, max_length=14)
    birth_date: date | None = None
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
```

### Smoke test rápido (bash, copiar e colar)
```bash
BASE=http://127.0.0.1:8000
curl -s $BASE/api/health | jq .
TOKEN=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}' | jq -r .access_token)
[ -n "$TOKEN" ] || { echo "Login falhou"; exit 1; }
curl -s $BASE/api/auth/profile -H "Authorization: Bearer $TOKEN" | jq .
curl -s $BASE/api/patients -H "Authorization: Bearer $TOKEN" | jq .
```
