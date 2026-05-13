# 🌿 Eco-Dispenser Inteligente — MVP POC

Possíveis nomes:
- [ ] Zé droguinha
- [ ] ajuda ai gnt...

Sistema de monitoramento e controle em tempo real para dispensers inteligentes, integrando Hardware (ESP32-C3), Backend (FastAPI) e Frontend (React).

## 🏗️ Arquitetura do Monorepo

Este projeto utiliza uma estrutura de monorepo organizada para facilitar o desenvolvimento simultâneo:

```text
.
├── firmware/         # Código C++ para ESP32-C3 (Arduino IDE)
├── backend/          # Servidor Proxy em FastAPI (Python)
├── frontend/         # Dashboard em React + Vite (TS)
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

O cérebro do sistema. Ele precisa estar na rede para que o resto funcione.

1. Abra o arquivo `firmware/eco-dispenser/eco-dispenser.ino` no **Arduino IDE**.
2. Siga as instruções de instalação de bibliotecas no [README do Firmware](firmware/README.md).
3. Faça o upload e pegue o IP no Monitor Serial.

### 2. Backend (Proxy)

A ponte de comunicação.

1. Configure o IP do ESP no arquivo `backend/.env`.
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

## 🐳 Docker (Execução Simplificada)

A maneira mais rápida de rodar o ecossistema completo (Backend, Frontend e Banco de Dados) é utilizando o Docker Compose.

### Modo de Produção

1. Certifique-se de que o IP do seu ESP32 está correto no arquivo `docker-compose.yml`.
2. Na raiz do projeto, execute:
   ```bash
   docker-compose up --build
   ```

### Serviços Disponíveis (Produção)
- **Frontend**: [http://localhost](http://localhost) (Servido via Nginx na porta 80)
- **Backend**: [http://localhost:8000](http://localhost:8000) (Documentação em [http://localhost:8000/docs](http://localhost:8000/docs))
- **PostgreSQL**: `localhost:5432` (Usuário: `user`, Senha: `password`, Banco: `smart_dispenser`)

Note: se você já tiver um PostgreSQL rodando na porta `5432` no host, o compose mapeará o banco do projeto para `5433`.

---

## 🔎 Testes rápidos (endpoints Auth)

Após subir os serviços (`docker compose up --build -d`), você pode testar os endpoints de autenticação com estes comandos:

1) Health check:
```bash
curl -s http://127.0.0.1:8000/api/health | jq
```

2) Registrar um cuidador (ex.: `alice`):
```bash
curl -s -X POST http://127.0.0.1:8000/auth/register \
   -H "Content-Type: application/json" \
   -d '{"username":"alice","password":"secret","full_name":"Alice"}' | jq
```

3) Login e captura de token:
```bash
RESP=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
   -H "Content-Type: application/json" \
   -d '{"username":"alice","password":"secret"}')
echo "$RESP" | jq
TOKEN=$(echo "$RESP" | jq -r .access_token)
```

4) Acessar profile com o token:
```bash
curl -s http://127.0.0.1:8000/profile -H "Authorization: Bearer $TOKEN" | jq
```

Se o `curl` não retornar JSON legível, remova `| jq` e verifique a saída bruta.

---

Se quiser, eu posso adicionar estes passos também no `backend/README.md`.

> [!NOTE]
> O banco de dados é populado automaticamente na primeira execução com o esquema definido em `database/init.sql`.

---

### Modo de Desenvolvimento (com Hot Reload)

O ambiente de desenvolvimento mantém o **hot reload** do Vite ativo, ou seja, alterações nos arquivos do frontend refletem no navegador instantaneamente, sem necessidade de rebuildar a imagem.

#### Como rodar

1. Certifique-se de que o IP do seu ESP32 está correto em `docker-compose.yml` (campo `ESP32_IP`).
2. Suba os serviços com o profile `dev`:
   ```bash
   docker-compose --profile dev up --build
   ```

#### Serviços Disponíveis (Desenvolvimento)
- **Frontend (dev)**: [http://localhost](http://localhost) — Vite dev server com HMR, mapeado na porta 80
- **Backend**: [http://localhost:8000](http://localhost:8000) (Documentação em [http://localhost:8000/docs](http://localhost:8000/docs))
- **PostgreSQL**: `localhost:5432` (Usuário: `user`, Senha: `password`, Banco: `smart_dispenser`)

#### Volumes e Hot Reload

Os seguintes diretórios são montados como volumes, permitindo edição local com reflexo imediato no container:

| Diretório local | Caminho no container |
|---|---|
| `frontend/src/` | `/app/frontend/src` |
| `frontend/public/` | `/app/frontend/public` |
| `frontend/index.html` | `/app/frontend/index.html` |
| `frontend/vite.config.ts` | `/app/frontend/vite.config.ts` |

> [!TIP]
> Para derrubar os containers e remover os volumes anônimos ao finalizar:
> ```bash
> docker-compose --profile dev down -v
> ```

---

## 🛠️ Resumo de Soluções (Troubleshooting)

Durante o desenvolvimento deste POC, resolvemos desafios críticos:

- **Arduino**: Uso da versão **2.0.17** do Core ESP32 no Boards Manager.
- **Linux**: Permissões de USB via grupo `dialout` (`sudo usermod -a -G dialout $USER`).
- **Rede**: Uso de `127.0.0.1` no proxy do Vite para evitar conflitos de IPv6.
- **JSON**: O firmware agora processa JSON manualmente para evitar erros de versão da biblioteca `ArduinoJson`.
- **Docker (frontend-dev)**: Se uma nova dependência foi adicionada ao `frontend/package.json` e o Vite reclamar com `Failed to resolve import "<pacote>"` dentro do container, o volume nomeado `frontend_node_modules` está com o `bun install` antigo em cache. Derrube com `docker compose --profile dev down -v` (ou remova o volume com `docker volume rm smartdispenser_lab1_frontend_node_modules`) antes de subir novamente.
