# 💻 Frontend — React Dashboard

Interface administrativa para monitoramento em tempo real do Eco-Dispenser.

## 🛠️ Instalação

Este projeto utiliza **Bun** como gerenciador de pacotes e runtime:

```bash
# Instalar Bun (primeira vez)
curl -fsSL https://bun.sh/install | bash

# Instalar dependências (da raiz do projeto)
cd ..
bun install

# OU instalar apenas do frontend
bun install
```

**Importante**: Este projeto **não utiliza npm ou yarn**. Sempre use `bun` para gerenciar pacotes.

## ⚙️ Proxy de Desenvolvimento

Para evitar erros de CORS e facilitar o desenvolvimento, configuramos um proxy no Vite.

- O destino é `http://127.0.0.1:8000` (backend).
- **Certifique-se de que o backend está rodando antes** de abrir o Dashboard.
- Usamos `127.0.0.1` (não `localhost`) para evitar problemas de IPv6.

## 🚀 Execução

```bash
# Desenvolvimento
bun run dev

# Build de produção
bun run build

# Preview do build
bun run preview

# Testes
bun test

# Storybook (desenvolvimento de componentes)
bun run storybook
```

Abra [http://localhost:5173](http://localhost:5173) no seu navegador.

## ✨ Funcionalidades

- **Badges de Status**: Verde indica conexão ativa com Backend e ESP32.
- **Controle de LED**: Clique para alternar o estado com feedback instantâneo.
- **Polling**: O estado do hardware é sincronizado automaticamente a cada 2 segundos.
- **Glassmorphism**: UI moderna com foco em experiência do usuário premium.

## 📜 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `bun run dev` | Inicia servidor de desenvolvimento (Vite) |
| `bun run build` | Compila TypeScript e cria build de produção |
| `bun run build:types` | Apenas verifica tipos TypeScript |
| `bun run preview` | Preview do build de produção |
| `bun test` | Executa testes com Vitest |
| `bun run storybook` | Abre Storybook para desenvolvimento de componentes |
| `bun run build-storybook` | Build estático do Storybook |
| `bun run lint` | Verifica código com Biome |
| `bun run format` | Formata código com Biome |

## 🛠️ Stack Tecnológica

- **Runtime**: Bun 1.3+ (substitui Node.js)
- **Framework**: React 19
- **Build Tool**: Vite 8
- **Linguagem**: TypeScript 6
- **Testes**: Vitest + Playwright
- **Componentes**: Storybook 10
- **Linter/Formatter**: Biome (substitui ESLint + Prettier)
- **Ícones**: Phosphor Icons

## 📖 Documentação para IA

Para contexto completo sobre arquitetura e padrões do projeto, consulte o arquivo [`agents.md`](../agents.md) na raiz do projeto.
