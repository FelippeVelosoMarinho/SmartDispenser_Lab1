# Integração entre módulos

Este documento é o **hub central**: como **firmware**, **backend**, **frontend** e **banco** conversam, e como o `docker-compose.yml` amarra os serviços.

## Visão em camadas

```text
┌─────────────────────────────────────────────────────────────┐
│  Navegador (usuário)                                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP(S)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React/Vite ou Nginx estático)                     │
│  • Dev: proxy interno /api → backend                         │
│  • Prod: Nginx repassa /api → smart_dispenser_backend:8000   │
└───────────────────────────┬─────────────────────────────────┘
                            │ /api/*
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                           │
│  • JWT, CRUD pacientes/medicações/agendas/dispensers/logs    │
│  • Proxy IoT: httpx → http://ESP32_IP (status, LED, eventos) │
│  • SQLAlchemy → PostgreSQL                                   │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌───────────────┐
        │  PostgreSQL   │         │  ESP32-C3     │
        │  (init.sql)   │         │  (firmware)   │
        └───────────────┘         └───────────────┘
```

## Rede Docker (`docker-compose.yml`)

| Serviço (nome DNS interno) | Imagem / build | Porta no host | Profile Compose |
|---------------------------|----------------|---------------|-----------------|
| `db` | `postgres:16-alpine` | **5433** → 5432 | *(sempre ativo)* |
| `backend` | `./backend` Dockerfile | **8000** → 8000 | *(sempre ativo)* |
| `frontend` | Nginx + build Bun | **8080** → 80 | `prod` |
| `frontend-dev` | Vite + Bun | **80** → 5173 | `dev` |

**Importante:** sem profile, sobem apenas **`db`** e **`backend`**. Para incluir interface web:

- Produção (build estático): `docker compose --profile prod up --build`
- Desenvolvimento (hot reload): `docker compose --profile dev up --build`

## Variáveis de ambiente críticas

| Variável | Onde | Função |
|----------|------|--------|
| `DATABASE_URL` | Backend no Compose | `postgresql://user:password@db:5432/smart_dispenser` |
| `ESP32_IP` | Backend (Compose ou `.env` local) | IP do ESP na LAN; usado para montar `ESP32_BASE_URL` |
| `JWT_SECRET` | Backend | Chave de assinatura JWT (defina em produção real) |
| `VITE_API_URL` | Container `frontend-dev` | Destino do proxy Vite para `/api` (nome do serviço Docker `smart_dispenser_backend` na URL interna) |

## Fluxo HTTP típico

1. **SPA + API na mesma origem (produção)**  
   O usuário acessa `http://localhost:8080`. O Nginx do frontend encaminha pedidos que começam com `/api` para `http://smart_dispenser_backend:8000`, evitando CORS no browser para essas rotas.

2. **Desenvolvimento com Compose**  
   O browser fala com `http://localhost` (porta 80). O Vite no container recebe `/api` e proxy para o backend via `VITE_API_URL`.

3. **Backend ↔ ESP32**  
   O backend mantém um `httpx.AsyncClient` com `base_url = http://{ESP32_IP}`. Endpoints em `app/api/endpoints/iot.py` consultam caminhos como `/status` no firmware. O PC/host precisa alcançar o IP do ESP na rede Wi-Fi (o container usa a rede Docker bridge do host Linux, em geral com rota para a LAN).

4. **Persistência**  
   Na subida do backend, `Base.metadata.create_all` garante tabelas SQLAlchemy; o Postgres já recebe o schema inicial via `database/init.sql` no primeiro start do volume.

## Contratos entre módulos

| De → Para | Contrato |
|-----------|----------|
| Frontend → Backend | REST sob prefixo `/api/...` (auth, pacientes, medicamentos, etc.) e documentação OpenAPI em `/docs` no backend |
| Backend → ESP32 | HTTP JSON nos endpoints expostos pelo firmware (ex.: `/status`); detalhes em [`firmware.md`](firmware.md) e código em `firmware/eco-dispenser/api_server.cpp` |
| Backend → PostgreSQL | SQLAlchemy + `DATABASE_URL` |

## Documentação por módulo

- [`backend.md`](backend.md)
- [`frontend.md`](frontend.md)
- [`database.md`](database.md)
- [`firmware.md`](firmware.md)
- Estrutura de pastas: [`MAPA-DIRETORIOS.md`](MAPA-DIRETORIOS.md)
