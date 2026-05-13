# Módulo — Backend (FastAPI)

## Papel

Servidor **FastAPI** que:

- Expõe API REST para o dashboard (autenticação JWT, domínio clínico e administrativo).
- Atua como **proxy IoT** para o ESP32 (`httpx.AsyncClient` com timeout configurável).
- Persiste dados em **PostgreSQL** (via SQLAlchemy).

## Entrada e execução

| Contexto | Comando / observação |
|----------|----------------------|
| Local | `cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000` |
| Docker | Imagem definida em `backend/Dockerfile`; comando `uvicorn main:app --host 0.0.0.0 --port 8000` |

## Configuração (`app/core/config.py`)

| Variável | Padrão / notas |
|----------|----------------|
| `DATABASE_URL` | Local: pode ser SQLite; no Compose: Postgres |
| `ESP32_IP` | IP do dispenser na rede Wi-Fi |
| `JWT_SECRET` | Obrigatório revisar em ambientes reais |
| `CORS_ORIGINS` | Lista explícita de origens permitidas (localhost Vite, etc.) |

## Rotas agregadas (`app/api/api.py`)

| Router | Prefixo típico |
|--------|----------------|
| `auth` | `/api/auth` — registro, login, perfil |
| `iot` | `/api` — health, LED, sync, eventos, heartbeat (integração hardware) |
| `patients` | `/api/patients` |
| `medications` | `/api/medications` |
| `schedules` | `/api/schedules` |
| `logs` | `/api/logs` |
| `dispensers` | `/api/dispensers` |

Health agregado que também testa reachability do ESP: **`GET /api/health`**.

## Documentação interativa

Com o servidor no ar: **`http://localhost:8000/docs`** (Swagger UI).

## Testes

Diretório `backend/tests/` (pytest). Útil validar contratos após mudanças na API.

## Integração

Detalhes de rede Docker e fluxos: [`INTEGRACAO.md`](INTEGRACAO.md).
