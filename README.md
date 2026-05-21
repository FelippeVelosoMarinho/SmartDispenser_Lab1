# 🌿 Pillar — MVP POC

Sistema de monitoramento e controle em tempo real para dispensers inteligentes, integrando Hardware (ESP32-C3), Backend (FastAPI) e Frontend (React).

Documentação de arquitetura e integração por módulo: pasta **[`claude-docs/`](claude-docs/README.md)** (mapa de diretórios, integração central e um `.md` por módulo).

## 🏗️ Arquitetura do Monorepo

Este projeto utiliza uma estrutura de monorepo organizada para facilitar o desenvolvimento simultâneo:

```text
.
├── firmware/         # Código C++ para ESP32-C3 (Arduino IDE)
├── backend/          # API FastAPI + proxy IoT (Python)
├── frontend/         # Dashboard em React + Vite (TS)
├── database/         # init.sql (PostgreSQL na primeira subida)
├── claude-docs/      # Documentação em Markdown por módulo + integração
└── biome.json        # Configuração de Lint/Format (Biome)
```

## 🚀 Como Iniciar (Ordem Recomendada)

### Pré-requisitos

Este projeto utiliza **Bun** como gerenciador de pacotes e runtime para o frontend:

```bash
# Instalar Bun (se ainda não tiver)
curl -fsSL https://bun.sh/install | bash

# Verificar instalação
bun --version
```

### 1. Hardware (Firmware)

O cérebro físico do dispenser. Ele precisa estar na rede para que o backend consiga alcançá-lo pelo IP.

1. Abra o arquivo `firmware/eco-dispenser/eco-dispenser.ino` no **Arduino IDE**.
2. Siga as instruções de instalação de bibliotecas no [README do Firmware](firmware/README.md).
3. Faça o upload e anote o IP no Monitor Serial.

### 2. Backend (API + proxy IoT)

A ponte entre o dashboard e o hardware.

1. Configure o IP do ESP no arquivo `backend/.env` (desenvolvimento local) **ou** em `docker-compose.yml` na variável `ESP32_IP` (Docker).
2. Siga o [README do Backend](backend/README.md) para iniciar o servidor.

### 3. Frontend (Dashboard)

A interface do usuário.

```bash
# Instalar dependências (da raiz do projeto)
bun install

# Iniciar servidor de desenvolvimento
bun run dev

# OU, alternativamente:
cd frontend
bun run dev
```

Abra `http://localhost:5173` no navegador.

---

## 🐳 Docker Compose — todos os módulos integrados

O **firmware não roda em container**: apenas **PostgreSQL**, **backend** e **frontend** são orquestrados pelo Compose. O ESP32 continua na rede Wi-Fi; o backend dentro do Docker usa `ESP32_IP` para falar com ele.

### Pré-requisitos

- [Docker Engine](https://docs.docker.com/engine/install/) e plugin **Compose v2** (`docker compose`).
- IP correto do ESP32 em `docker-compose.yml` → `services.backend.environment` → `ESP32_IP=...`

### Serviços sempre ativos (stack mínima API + banco)

Sem **profile**, sobem só **`db`** e **`backend`**:

```bash
docker compose up --build -d
```

| Serviço | Container | Porta no host | Descrição |
|---------|-----------|---------------|-----------|
| `db` | `smart_dispenser_db` | **5433** → 5432 | PostgreSQL 16 |
| `backend` | `smart_dispenser_backend` | **8000** → 8000 | FastAPI + Uvicorn |

Credenciais do banco (Compose): usuário `user`, senha `password`, banco `smart_dispenser`.

### Perfil **prod** — frontend estático (Nginx) + API + banco

Interface web compilada e servida por Nginx; `/api` é enviado ao backend na rede interna.

```bash
docker compose --profile prod up --build -d
```

| Serviço extra | Container | Porta no host | URL típica |
|---------------|-----------|---------------|------------|
| `frontend` | `smart_dispenser_frontend` | **8080** → 80 | `http://localhost:8080` |

- **Backend / OpenAPI**: `http://localhost:8000` — documentação em `http://localhost:8000/docs`
- **Postgres (host)**: `localhost:5433`

### Perfil **dev** — Vite com hot reload + API + banco

Útil para editar `frontend/` no host com reflexo imediato no container.

```bash
docker compose --profile dev up --build -d
```

| Serviço extra | Container | Porta no host | URL típica |
|---------------|-----------|---------------|------------|
| `frontend-dev` | `smart_dispenser_frontend_dev` | **80** → 5173 | `http://localhost` |

Variável no Compose: `VITE_API_URL=http://smart_dispenser_backend:8000` (proxy interno do Vite para `/api`).

### Volumes e hot reload (profile `dev`)

| Diretório local | Caminho no container |
|-----------------|----------------------|
| `frontend/src/` | `/app/frontend/src` |
| `frontend/public/` | `/app/frontend/public` |
| `frontend/index.html` | `/app/frontend/index.html` |
| `frontend/vite.config.ts` | `/app/frontend/vite.config.ts` |

### Encerrar e limpar

```bash
docker compose --profile prod --profile dev down
```

Para remover também volumes anônimos/nomeados usados pelo profile dev (ex.: cache de `node_modules`):

```bash
docker compose --profile dev down -v
```

Se uma nova dependência foi adicionada ao `frontend/package.json` e o Vite falhar com `Failed to resolve import "<pacote>"` dentro do container, derrube com `-v` ou remova o volume `smartdispenser_lab1_frontend_node_modules` antes de subir de novo.

### Rede e ESP32 com Docker no Linux

O backend no container usa o IP **LAN** do ESP (`ESP32_IP`). Em Linux, a rede bridge do Docker em geral permite alcançar IPs da mesma rede Wi-Fi do host; se não houver rota, verifique firewall do host e se o ESP e o PC estão na mesma sub-rede (sem isolamento de cliente no roteador).

---

## 🔎 Testes rápidos (endpoints Auth)

Após subir os serviços (`docker compose up --build -d`), você pode testar os endpoints de autenticação com estes comandos:

1) Health check (inclui teste de alcance do ESP32):

```bash
curl -s http://127.0.0.1:8000/api/health | jq
```

2) Registrar um cuidador (ex.: `alice`):

```bash
curl -s -X POST http://127.0.0.1:8000/api/auth/register \
   -H "Content-Type: application/json" \
   -d '{"username":"alice","password":"secret","full_name":"Alice"}' | jq
```

3) Login e captura de token:

```bash
RESP=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"username":"alice","password":"secret"}')
echo "$RESP" | jq
TOKEN=$(echo "$RESP" | jq -r .access_token)
```

4) Acessar perfil com o token:

```bash
curl -s http://127.0.0.1:8000/api/auth/profile -H "Authorization: Bearer $TOKEN" | jq
```

Se o `curl` não retornar JSON legível, remova `| jq` e verifique a saída bruta.

---

Se quiser, eu posso adicionar estes passos também no `backend/README.md`.

> [!NOTE]
> O banco de dados é populado automaticamente na primeira execução do volume PostgreSQL com o esquema definido em `database/init.sql`.

---

## 🛠️ Resumo de Soluções (Troubleshooting)

Durante o desenvolvimento deste POC, resolvemos desafios críticos:

- **Arduino**: Uso da versão **2.0.17** do Core ESP32 no Boards Manager.
- **Linux**: Permissões de USB via grupo `dialout` (`sudo usermod -a -G dialout $USER`).
- **Rede**: Uso de `127.0.0.1` no proxy do Vite para evitar conflitos de IPv6.
- **JSON**: O firmware processa JSON manualmente para evitar erros de versão da biblioteca `ArduinoJson`.
- **Docker (frontend-dev)**: Se uma nova dependência foi adicionada ao `frontend/package.json` e o Vite reclamar com `Failed to resolve import "<pacote>"` dentro do container, o volume nomeado `frontend_node_modules` está com o `bun install` antigo em cache. Derrube com `docker compose --profile dev down -v` (ou remova o volume com `docker volume rm smartdispenser_lab1_frontend_node_modules`) antes de subir novamente.
