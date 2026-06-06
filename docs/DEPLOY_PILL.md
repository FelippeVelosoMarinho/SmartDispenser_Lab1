# Deploy em produção — pill.josoesantos.dev

HTTPS via **Caddy** + certificado Let's Encrypt (DNS challenge Cloudflare). Substitui ngrok para Web Bluetooth e acesso remoto.

## Pré-requisitos

1. DNS **A** ou **CNAME** de `pill.josoesantos.dev` apontando para o IP do servidor (`2.24.216.183` ou o IP atual).
2. Token Cloudflare com permissão **Zone → DNS → Edit** para o domínio.
3. Arquivo `.env` na **raiz do repositório** (copie de `.env.example`):

```env
CLOUDFLARE_API_TOKEN=seu_token_aqui
VITE_ESP_BACKEND_URL=https://pill.josoesantos.dev
```

4. `backend/.env` com SMTP, períodos, etc. (como já configurado).

## Subir stack de produção

```bash
docker compose --profile prod up --build -d
```

Serviços:

| Serviço | Função |
|---------|--------|
| `db` | PostgreSQL |
| `backend` | API `:8001` no host |
| `frontend` | Nginx estático + proxy `/api` → backend |
| `caddy` | HTTPS `:443` → `frontend:80` |

## URLs

| Uso | URL |
|-----|-----|
| **Dashboard (navegador)** | https://pill.josoesantos.dev |
| **API / Swagger** | https://pill.josoesantos.dev/api/... ou `http://servidor:8001/docs` |
| **ESP heartbeat (BLE)** | `https://pill.josoesantos.dev` (via `VITE_ESP_BACKEND_URL`) |

Fluxo:

```
Navegador → https://pill.josoesantos.dev → Caddy:443 → frontend:80 → /api → backend:8000
ESP       → https://pill.josoesantos.dev/api/heartbeat → (mesmo caminho)
```

Alternativa para o ESP (sem TLS no firmware): `VITE_ESP_BACKEND_URL=http://SEU_IP:8001`

## Pareamento BLE

1. Acesse https://pill.josoesantos.dev (HTTPS nativo — Web Bluetooth OK).
2. Pareie o dispensador — o frontend envia `backend_url` = `VITE_ESP_BACKEND_URL`.
3. No serial do ESP: `BURL: https://pill.josoesantos.dev` e `[Heartbeat] 200`.

Após mudar `VITE_ESP_BACKEND_URL`, **rebuild** do frontend:

```bash
docker compose --profile prod up --build -d frontend
```

Para `frontend-dev`, reinicie o container (Vite lê env na subida).

## Verificação

```bash
curl -s https://pill.josoesantos.dev/api/health | jq
curl -s -X POST https://pill.josoesantos.dev/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"dispenser_id":"8C:D0:B2:A9:17:4B","online":true,"ip_address":"192.168.0.100"}'
```

## ngrok

Não é mais necessário para produção. Ver `claude-docs/ngrok-setup.md` apenas para dev local sem domínio.
