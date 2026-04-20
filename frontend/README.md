# 💻 Frontend — React Dashboard

Interface administrativa para monitoramento em tempo real do Eco-Dispenser.

## 🛠️ Instalação

Utilizamos **Bun** (ou NPM/Yarn) para gerenciamento:

```bash
bun install
# ou
npm install
```

## ⚙️ Proxy de Desenvolvimento

Para evitar erros de CORS e facilitar o desenvolvimento, configuramos um proxy no Vite.

- O local de destino é `http://127.0.0.1:8000`.
- Certifique-se de que o backend está rodando **antes** de abrir o Dashboard.

## 🚀 Execução

```bash
bun run dev
# ou
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no seu navegador.

## ✨ Funcionalidades

- **Badges de Status**: Verde indica conexão ativa com Backend e ESP32.
- **Controle de LED**: Clique para alternar o estado com feedback instantâneo.
- **Polling**: O estado do hardware é sincronizado automaticamente a cada 2 segundos.
- **Glassmorphism**: UI moderna com foco em experiência do usuário premium.
