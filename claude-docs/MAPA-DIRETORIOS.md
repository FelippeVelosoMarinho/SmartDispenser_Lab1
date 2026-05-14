# Mapa de diretórios — SmartDispenser Lab1

Visão estática da organização do monorepo **Eco-Dispenser / Smart Dispenser**. Caminhos relativos à raiz do repositório.

## Raiz do projeto

| Caminho | Função |
|--------|--------|
| `README.md` | Visão geral, execução local e Docker |
| `docker-compose.yml` | Orquestração de **PostgreSQL**, **backend**, **frontend (prod)** e **frontend-dev** |
| `package.json` | Workspace Bun na raiz (scripts `dev`, lint); inclui o pacote `frontend` |
| `bun.lock` | Lockfile das dependências Bun |
| `biome.json` | Configuração do Biome (lint/format) |
| `agents.md` | Notas de contexto para assistentes / IA |
| `.gitignore` | Arquivos ignorados pelo Git |

## `database/`

| Caminho | Função |
|--------|--------|
| `init.sql` | Script SQL executado na **primeira inicialização** do container PostgreSQL (schema e índices) |

## `backend/`

API **FastAPI** com proxy HTTP para o firmware ESP32 e persistência em banco.

| Caminho | Função |
|--------|--------|
| `main.py` | Ponto de entrada (`uvicorn main:app`) |
| `Dockerfile` | Imagem de produção Python 3.11 + Uvicorn |
| `requirements.txt` / `pyproject.toml` | Dependências Python |
| `uv.lock` | Lockfile (uv), quando usado |
| `README.md` | Execução local do backend |
| `MIGRATION_GUIDE.md` | Histórico / guia de migração da API |
| `app/main.py` | Factory da aplicação FastAPI, CORS, lifespan (`httpx.AsyncClient` para o ESP32) |
| `app/api/api.py` | Agregação dos routers |
| `app/api/endpoints/` | Rotas: `auth`, `iot`, `patients`, `medications`, `schedules`, `logs`, `dispensers` |
| `app/core/` | `config`, `database`, `security` |
| `app/crud/` | Operações de persistência por domínio |
| `app/models/` | Modelos SQLAlchemy (`domain.py`) |
| `app/schemas/` | Pydantic |
| `tests/` | Testes com pytest |

## `frontend/`

Dashboard **React + Vite + TypeScript**, gerenciado por **Bun**.

| Caminho | Função |
|--------|--------|
| `package.json` | Scripts (`dev`, `build`, testes, Storybook, Biome) |
| `vite.config.ts` | Dev server e **proxy** `/api` → backend |
| `index.html` | HTML raiz do SPA |
| `Dockerfile` | Build estático + **Nginx** (proxy `/api` para o backend no Compose) |
| `Dockerfile.dev` | Imagem com Vite + hot reload |
| `README.md` | Instalação e execução local |
| `src/main.tsx` | Entrada React |
| `src/router.tsx` | Rotas |
| `src/pages/` | Páginas (login, dashboard, pacientes, dispensers, etc.) |
| `src/layouts/` | Layout da área autenticada |
| `src/auth/` | Contexto de autenticação |
| `src/components/` | Componentes reutilizáveis e UI |
| `src/stories/` | Storybook |

## `firmware/`

Firmware **Arduino** para **ESP32-C3** (hardware não roda em Docker).

| Caminho | Função |
|--------|--------|
| `README.md` | Arduino IDE, bibliotecas e upload |
| `eco-dispenser/` | Sketch principal (`eco-dispenser.ino`), servidor HTTP assíncrono, carrossel, botões, alertas |
| `eco-dispenser/secrets.h` | Credenciais Wi-Fi (não versionar valores reais) |

## `.claude/`

Regras e skills específicas do projeto (ex.: design system Pillar). **Não** faz parte do runtime da aplicação.

---

Para como esses diretórios se conectam em rede e em Docker, veja [`INTEGRACAO.md`](INTEGRACAO.md).
