# Módulo — Frontend (React + Vite)

## Papel

Interface web para cuidadores/administração: login, dashboard, pacientes, dispensers e fluxos associados.

## Stack

- **Bun** como runtime e gerenciador de pacotes do monorepo.
- **React** + **Vite** + **TypeScript**.
- **Biome** para lint/format na raiz do repositório.

## Execução local (sem Docker)

Na raiz:

```bash
bun install
bun run dev
```

Ou apenas dentro de `frontend/` com os mesmos comandos definidos no `package.json` do pacote.

O Vite sobe em **`http://localhost:5173`** com proxy de **`/api`** para `http://127.0.0.1:8000` (variável `VITE_API_URL` sobrescreve o destino).

## Docker

Dois caminhos no Compose:

| Serviço | Profile | Porta host | Comportamento |
|---------|---------|------------|---------------|
| `frontend` | `prod` | **8080** | Build estático servido por **Nginx**; `/api` vai ao backend pelo nome `smart_dispenser_backend` |
| `frontend-dev` | `dev` | **80** | **Vite** com volumes montados para hot reload; `VITE_API_URL` aponta para o backend no Compose |

## Integração com backend

- Em desenvolvimento na máquina host, o backend deve estar em **`127.0.0.1:8000`** para o proxy padrão funcionar.
- Em Compose **dev**, o proxy usa o hostname Docker do backend conforme `docker-compose.yml`.

## Outros scripts

Storybook, Vitest e Playwright estão configurados no `frontend/package.json`; ver também `frontend/README.md`.

## Documentação geral

Fluxo ponta a ponta: [`INTEGRACAO.md`](INTEGRACAO.md).
