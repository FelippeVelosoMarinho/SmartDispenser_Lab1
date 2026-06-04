# 📡 Mapeamento do Backend e Plano de Implementação do Notificador (FastAPI)

Este documento descreve o mapeamento arquitetural do módulo **Backend (FastAPI)** do projeto **Smart Dispenser** e apresenta o plano detalhado para implementar e configurar o sistema de notificações (Notificador) via e-mail utilizando as credenciais SMTP do Google já presentes no ambiente.

---

## 🔍 1. Mapeamento Arquitetural do Backend

O backend atua como um intermediário (proxy) entre a aplicação Web (Frontend), o banco de dados (PostgreSQL/SQLite) e o hardware físico (ESP32-C3).

```text
       ┌───────────┐           HTTP REST           ┌──────────────┐
       │  Browser  │ ◄───────────────────────────► │   FastAPI    │
       │ (React)   │                               │  (Backend)   │
       └───────────┘                               └──────┬───────┘
                                                          │
                    ┌─────────────────────────────────────┼─────────────────────────────────────┐
                    ▼                                     ▼                                     ▼
             SQLAlchemy ORM                           HTTP Proxy                         BackgroundTasks
                    ▼                                     ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐             ┌───────────────────────┐
        │      PostgreSQL       │             │       ESP32-C3        │             │    Serviço SMTP       │
        │      (Database)       │             │      (Hardware)       │             │   (Notificador)       │
        └───────────────────────┘             └───────────────────────┘             └───────────────────────┘
```

### 📂 Estrutura de Diretórios e Componentes

A estrutura de arquivos do backend em `backend/app/` está organizada da seguinte forma:

1. **Ponto de Entrada (`app/main.py` & `main.py`)**:
   - Inicializa a aplicação FastAPI.
   - Configura CORS e o ciclo de vida (`lifespan`), que instancia e encerra o `httpx.AsyncClient` compartilhado para comunicação com o ESP32.
   - Executa a criação automática de tabelas via `Base.metadata.create_all`.

2. **Configuração (`app/core/`)**:
   - `config.py`: Centraliza variáveis carregadas via `.env` (ex: `DATABASE_URL`, `ESP32_IP`, `SECRET_KEY`).
   - `database.py`: Define a sessão do SQLAlchemy (`SessionLocal`, `get_db`) e a classe base `Base`.
   - `security.py`: Implementa lógica de hashing de senhas e manipulação de tokens JWT.

3. **Rotas e API (`app/api/`)**:
   - `api.py`: Concentra e inclui todos os roteadores sob o prefixo `/api`.
   - `endpoints/`: Contém os controladores por domínio:
     - `auth.py`: Autenticação e perfil do usuário.
     - `iot.py`: Endpoints que o ESP32 chama (`/api/sync/{hardware_id}`, `/api/event`, `/api/heartbeat`) e rotas para controle do LED físico.
     - `patients.py` / `medications.py` / `schedules.py` / `dispensers.py`: CRUDs clínicos e administrativos.
     - `logs.py`: Histórico de dispensação e recarga de medicamentos.

4. **Modelos de Dados (`app/models/domain.py`)**:
   - Define a tabela de associação `patient_caregiver` e as entidades:
     - **`User`**: Identidade de login do cuidador/usuário.
     - **`Patient`**: Dados do paciente, vinculado aos cuidadores e aos dispensers.
     - **`Caregiver`**: Representação do cuidador (contém o campo `notifications_enabled`).
     - **`Dispenser`**: Cadastro do hardware físico associado a um paciente (estoques críticos e IP).
     - **`Drawer` e `Slot`**: Estrutura física interna (gavetas e posições) que armazena a medicação e quantidade de pílulas.
     - **`Medication`**: Nome, dosagem e descrição das pílulas.
     - **`Schedule`**: Horários programados em que o dispenser ejetará a medicação de determinado slot.
     - **`DispensationLog`**: Log de cada evento de ejeção física contendo o campo `caregiver_notified`.
     - **`RefillHistory`**: Log de reabastecimentos realizados.

5. **Acesso ao Banco (`app/crud/`)**:
   - Arquivos especializados (`user.py`, `patient.py`, `dispenser.py`, `schedule.py`, `log.py`, `medication.py`) com operações puras SQL via SQLAlchemy.

6. **Validação de Dados (`app/schemas/`)**:
   - Contratos de entrada e saída (Pydantic models) divididos por recursos (auth, iot, log, etc.).

---

## 📧 2. Planejador do Notificador via FastAPI

O objetivo do Notificador é enviar alertas automáticos por e-mail para o cuidador quando:
1. **O Paciente tomar a medicação** (Confirmação de ingestão).
2. **O Paciente esquecer ou falhar na ingestão** (Alerta de dose não tomada ou erro no hardware).
3. **O estoque do compartimento estiver crítico** (`critical_stock=True`).

### ⚙️ Configuração Inicial (.env)
O arquivo `backend/.env` já possui a credencial necessária:
```env
APP_PASSWORD_GOOGLE="aemt uiwz tugo mpyw"
```
Essa variável representa uma **Senha de App do Gmail**, o que permite autenticar diretamente nos servidores SMTP do Google (`smtp.gmail.com`) de forma segura.

---

### 🗺️ Cronograma de Ações para Implementação

Abaixo está o fluxo passo a passo para a estruturação do Notificador.

#### 🟩 Passo 1: Atualizar a Configuração (`app/core/config.py`)
Mapear as novas variáveis do servidor SMTP no arquivo de configuração do sistema.

```python
# Adicionar ao app/core/config.py
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587  # Porta padrão para TLS
SMTP_USER = "seu_email_remetente@gmail.com"  # Substituir ou ler do env se preferir
SMTP_PASSWORD = os.getenv("APP_PASSWORD_GOOGLE", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "SmartDispenser <seu_email_remetente@gmail.com>")
```

#### 🟩 Passo 2: Criar o Serviço de Notificação (`app/services/notifier.py`)
Criar uma estrutura para encapsular o envio de e-mails usando `smtplib` e `email.mime` padrão do Python, evitando adicionar dependências desnecessárias.

O serviço utilizará HTML dinâmico para dar um tom profissional e premium aos e-mails.

```python
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core import config

def send_email_notification(to_email: str, subject: str, html_body: str):
    """
    Função síncrona para envio de e-mails usando SMTP do Gmail.
    Deve ser chamada via BackgroundTasks do FastAPI para não bloquear as threads assíncronas do event loop.
    """
    if not config.SMTP_PASSWORD:
        print("⚠️ Envio de e-mail cancelado: APP_PASSWORD_GOOGLE não configurada.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config.EMAIL_FROM
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT) as server:
            server.starttls()  # Upgrade de segurança
            server.login(config.SMTP_USER, config.SMTP_PASSWORD)
            server.sendmail(config.EMAIL_FROM, to_email, msg.as_string())
            print(f"📧 E-mail de notificação enviado com sucesso para {to_email}")
    except Exception as e:
        print(f"❌ Falha ao enviar e-mail de notificação: {e}")
```

#### 🟩 Passo 3: Criar Templates HTML Premium (`app/services/templates.py`)
Desenhar templates elegantes e de fácil leitura, alinhados com o tom inclusivo da marca:

- **Template de Sucesso (Medicação Ingerida)**: Um design em tons verdes com o horário e nome da medicação.
- **Template de Alerta (Medicação Não Ingerida)**: Tons vermelhos/laranjas indicando que a dose foi pulada.
- **Template de Estoque Crítico**: Tons de aviso solicitando a intervenção do cuidador.

*Exemplo de estrutura de e-mail:*
```html
<div style="font-family: sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
    <h2 style="color: #0f766e;">Medicação Tomada com Sucesso! 🟢</h2>
    <p>Olá, o paciente <strong>{patient_name}</strong> ingeriu o medicamento <strong>{medication_name}</strong> às {time}.</p>
    <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;">
    <small style="color: #64748b;">Este é um serviço automatizado do SmartDispenser.</small>
</div>
```

#### 🟩 Passo 4: Integrar nas Rotas Físicas (`app/api/endpoints/iot.py`)
Conectar os gatilhos no processamento dos eventos físicos do hardware. Como o ESP32 pode ter um timeout restrito, utilizaremos **`BackgroundTasks`** para deferir o disparo do e-mail.

```python
# Exemplo de integração no endpoint /api/event
from fastapi import BackgroundTasks
from app.services.notifier import send_email_notification
from app.services.templates import get_dispensation_html_template

@router.post("/event", response_model=IotEventResponse)
async def process_iot_event(
    event: IotEventCreate,
    background_tasks: BackgroundTasks,  # Adicionado
    db: Session = Depends(get_db)
):
    # 1. Processa e armazena o log no banco normalmente
    log_data = {...}
    created_log = crud_log.create_dispensation_log(db, log_data)
    
    # 2. Busca dados do Cuidador e Paciente para saber para onde enviar
    # (Exemplo: obter o email através do relacionamento patient -> caregivers)
    patient = db.query(Patient).filter(Patient.id == event.patient_id).first()
    if patient and patient.caregivers:
        for caregiver in patient.caregivers:
            if caregiver.notifications_enabled and caregiver.email:
                # Prepara o template HTML
                html_content = get_dispensation_html_template(
                    patient_name=patient.full_name,
                    medication_name=event.medication_id, # Resolver nome real da medicação
                    success=event.success,
                    timestamp=created_log.actual_execution_time
                )
                
                # Executa o e-mail em background
                background_tasks.add_task(
                    send_email_notification,
                    to_email=caregiver.email,
                    subject=f"Alerta SmartDispenser: Ingestão de {patient.full_name}",
                    html_body=html_content
                )
                
                # Marca no banco que o cuidador foi programado para notificação
                created_log.caregiver_notified = True
        
        db.commit()

    return IotEventResponse(...)
```

#### 🟩 Passo 5: Alertas de Telemetria no Heartbeat
No endpoint `/api/heartbeat`, monitorar o status do dispenser a cada sinal enviado pelo dispositivo:

```python
@router.post("/heartbeat", response_model=HeartbeatResponse)
async def process_heartbeat(
    heartbeat: HeartbeatCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # 1. Registra os dados físicos no banco
    # 2. Verifica se critical_stock == True (transição false→true)
    if heartbeat.critical_stock:
        # Recupera dados do cuidador e adiciona tarefa em background
        # background_tasks.add_task(send_email_notification, ...)
```

---

## 🛠️ 3. Estratégia de Validação e Testes

Para garantir que a integração SMTP e os envios assíncronos funcionam sem comprometer as rotas, o plano prevê as seguintes validações:

1. **Script de Teste de Conectividade SMTP**:
   Criar um pequeno script em `backend/tests/test_smtp.py` para disparar um e-mail direto a partir da linha de comando, permitindo testar se a senha de app do Gmail está com as permissões corretas sem precisar iniciar o app web ou simular o hardware.

2. **Testes Unitários via Pytest**:
   Adicionar no suite de testes (`backend/tests/`) testes unitários mockando o envio da função `send_email_notification` para validar o fluxo de código lógico em endpoints como `/api/event` e `/api/heartbeat`.

3. **Validação do Front**:
   Garantir que a opção do cuidador para desativar as notificações na tela de perfil do app Web atualize com sucesso o campo `Caregiver.notifications_enabled` via requisição `PATCH /api/patients` (ou endpoint correspondente).
