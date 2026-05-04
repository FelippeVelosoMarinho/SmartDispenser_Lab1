# 🏗️ Arquitetura e Planejamento do Backend Functional

Este documento descreve a arquitetura, a stack tecnológica e o plano de implementação para transformar o backend proxy em um sistema funcional completo com persistência e lógica de negócio.

## 🛠️ Stack Tecnológica

| Componente | Tecnologia | Motivo |
| :--- | :--- | :--- |
| **Framework** | **FastAPI** | Alta performance, tipagem estática e geração automática de OpenAPI (Swagger). |
| **ORM** | **SQLModel** | Combina SQLAlchemy e Pydantic, reduzindo a duplicação de código entre modelos de banco e esquemas de API. |
| **Migrações** | **Alembic** | Controle de versão do banco de dados e evolução segura do esquema. |
| **Banco de Dados** | **PostgreSQL** | Relacional, robusto e suporte nativo a UUIDs e JSONB. |
| **Segurança** | **OAuth2 + JWT** | Autenticação stateless segura para web e dispositivos IoT. |
| **Task Runner** | **Bun / Poe / Makefile** | Automação de comandos de desenvolvimento. |

---

## 📂 Estrutura de Pastas Planejada

```text
backend/
├── app/
│   ├── main.py              # Ponto de entrada da aplicação
│   ├── api/                 # Roteadores da API (v1)
│   │   ├── api.py           # Agregador de rotas
│   │   └── endpoints/       # auth.py, patients.py, iot.py, etc.
│   ├── core/                # Configurações globais (security, config.py)
│   ├── db/                  # Sessão do banco e base model
│   ├── models/              # Modelos SQLModel (espelho do banco)
│   ├── schemas/             # Modelos Pydantic (request/response)
│   └── crud/                # Lógica de acesso ao banco (Create, Read, Update, Delete)
├── alembic/                 # Scripts de migração do banco
├── tests/                   # Testes automatizados (pytest)
├── alembic.ini              # Configuração do Alembic
└── pyproject.toml           # Dependências e metadados
```

---

## 🔄 Fluxo de Desenvolvimento com Alembic

O Alembic será responsável por garantir que o banco de dados Docker esteja sempre sincronizado com os modelos Python.

1. **Inicialização**: `alembic init alembic`
2. **Gerar Migração Automática**:
   ```bash
   alembic revision --autogenerate -m "create_initial_tables"
   ```
3. **Aplicar no Banco**:
   ```bash
   alembic upgrade head
   ```

---

## 🛣️ Definição das Rotas Principais

### 1. Autenticação e Usuários (Auth)
*   `POST /auth/register`: Recebe `tax_id`, `full_name`, `password`. Hashea a senha com `passlib` (bcrypt).
*   `POST /auth/login`: Valida credenciais e retorna um `access_token` JWT.
*   `GET /profile`: Usa um `Depends(get_current_user)` para retornar dados do cuidador logado.

### 2. Gestão de Pacientes (Patients)
*   `GET /patients`: Filtra pacientes onde o `caregiver_id` corresponde ao usuário logado na tabela `patient_caregiver`.
*   `POST /patients`: Cria registro e estabelece o vínculo na tabela de junção.

### 3. Configuração do Hardware (Dispensers & Slots)
*   `POST /dispensers/claim`: O cuidador digita o `hardware_id` (MAC) impresso no dispositivo. O backend vincula o dispenser ao paciente selecionado.
*   `PATCH /slots/{id}`: Atualiza `medication_id` ou `current_pill_count`. Se a contagem chegar a um nível crítico, emite alerta.

### 4. Regras de Dispensação (Schedules)
*   `POST /schedules`: Define `slot_id`, `scheduled_time` e `pills_per_dose`. Valida se o slot tem capacidade.
*   `GET /schedules`: Retorna a grade de horários formatada para o dashboard.

### 5. Interface IoT (Endpoints de Dispositivo)
*   `GET /iot/sync/{hardware_id}`: **A rota mais importante.** O hardware chama ao iniciar. O backend busca todos os `Schedules` ativos para aquele `hardware_id` e retorna um JSON simplificado para o ESP32.
*   `POST /iot/event`: Recebe confirmação de que o motor girou ou que o sensor de presença detectou a retirada do comprimido.
*   `POST /iot/heartbeat`: Atualiza `last_sync` e `is_online` na tabela `dispensers`.

---

## ⚡ Fluxo Lógico: Da Configuração à Ingestão

1. **Configuração**: O Cuidador usa o App (React) -> Backend -> DB (Salva Paciente, Slot e Schedule).
2. **Sincronia**: O Dispenser (ESP32) liga -> `GET /iot/sync` -> Recebe lista de horários -> Salva na memória local (RTC).
3. **Ação**: O horário chega (ex: 08:00) -> ESP32 gira o motor -> Emite sinal sonoro.
4. **Confirmação**:
   * O hardware envia `POST /iot/event` com status `success`.
   * **Lógica Interna do Backend**:
     1. Localiza o `slot_id`.
     2. `current_pill_count = current_pill_count - pills_dispensed`.
     3. Cria entrada em `dispensation_logs`.
     4. Se `current_pill_count < threshold`, dispara notificação Push via WebSocket ou Firebase.

---

## 🚀 Como Implementar Cada Função

1. **Modelagem**: Defina as classes em `app/models/` herdando de `SQLModel, table=True`.
2. **Segurança**: Configure o `OAuth2PasswordBearer` no FastAPI para proteger as rotas de Cuidador.
3. **Dependência de DB**: Crie uma função `get_session` para injetar a conexão do banco nas rotas.
4. **Log de Eventos**: Use `BackgroundTasks` do FastAPI no endpoint `/iot/event` para processar a baixa de estoque sem travar a resposta para o hardware.
