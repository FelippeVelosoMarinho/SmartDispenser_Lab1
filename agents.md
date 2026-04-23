# AI Agent Context for Eco-Dispenser Project

This document provides essential context for AI coding agents working on the Eco-Dispenser Inteligente project. Last updated: 2026-04-21

## Project Overview

Eco-Dispenser is a smart medication dispenser system integrating:
- **Hardware**: ESP32-C3 microcontroller (C++/Arduino)
- **Backend**: FastAPI proxy server (Python with uv)
- **Frontend**: React dashboard (TypeScript + Vite)

This is an MVP/POC for an open-source medication dispenser designed for people with neurodivergency and disabilities.

## Package Manager: Bun

**CRITICAL**: This project uses **Bun** exclusively for JavaScript/TypeScript package management and script execution.

### Why Bun?

1. **Performance**: 2-10x faster than npm/yarn for installs and script execution
2. **All-in-one**: Package manager, test runner, bundler, and runtime in one tool
3. **Native TypeScript**: Direct TS execution without transpilation overhead
4. **Workspace support**: Better monorepo handling than npm
5. **Drop-in replacement**: Compatible with npm scripts and package.json

### Installation Requirements

- **Bun version**: 1.3.13 (as of 2026-04-21)
- Install via: `curl -fsSL https://bun.sh/install | bash`
- Verify: `bun --version`

### Package Management Standards

#### Installing Dependencies

```bash
# From project root (installs all workspaces)
bun install

# Add a package to frontend
bun add <package> --cwd frontend

# Add dev dependency
bun add -d <package> --cwd frontend
```

#### Running Scripts

```bash
# From root (recommended)
bun run dev                    # Start frontend dev server
bun run dev:frontend          # Explicit frontend dev
bun run build:frontend        # Build frontend for production
bun run test:frontend         # Run frontend tests

# From frontend directory
cd frontend
bun run dev
bun run build
bun run test
bun run storybook
```

#### NEVER Use These Commands

- `npm install` ❌
- `npm run <script>` ❌
- `yarn add` ❌
- `pnpm install` ❌

**Always use `bun` commands instead.**

### Lockfile Management

- **Use**: `bun.lock` (committed to git)
- **Ignore**: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

The `.gitignore` is configured to exclude npm/yarn/pnpm lockfiles.

## Frontend Architecture

### Tech Stack

- **Framework**: React 19.2.5
- **Build Tool**: Vite 8.0.9 (run via Bun)
- **Language**: TypeScript 6.0.2
- **Testing**: Vitest 4.1.5 + Playwright
- **Component Library**: Storybook 10.3.5
- **Icons**: Phosphor Icons
- **Styling**: CSS (Glassmorphism design)
- **Linting**: Biome (not ESLint)

### Key Scripts Explained

```json
{
  "dev": "bun --bun vite",              // Dev server with Bun runtime
  "build": "bun run build:types && bun --bun vite build",  // Type check + build
  "build:types": "tsc -b",               // TypeScript compilation check
  "test": "bun test",                    // Run tests with Bun
  "storybook": "bunx storybook dev -p 6006",  // Component development
  "lint": "bunx @biomejs/biome check .", // Lint with Biome
  "format": "bunx @biomejs/biome format --write ." // Format with Biome
}
```

### Important Patterns

#### Using `bun --bun` Flag

The `--bun` flag forces Bun to use its native runtime instead of Node.js compatibility mode:
- Faster startup
- Lower memory usage
- Direct access to Bun APIs

Use it for: `vite`, `vitest`, and other build tools.

#### Using `bunx` (Bun's npx)

`bunx` executes packages without installing them globally:
- `bunx storybook` - Run Storybook
- `bunx @biomejs/biome` - Run Biome linter/formatter

### Directory Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   ├── stories/        # Storybook stories
│   └── ...
├── public/             # Static assets
├── .storybook/         # Storybook config
├── vite.config.ts      # Vite + Vitest config
├── tsconfig.json       # TypeScript config
└── package.json        # Frontend dependencies
```

## Backend Architecture

### Tech Stack

- **Framework**: FastAPI (Python)
- **Package Manager**: uv (modern Python package manager)
- **Purpose**: Proxy between frontend and ESP32 hardware

### Running Backend

```bash
cd backend
uvicorn main:app --reload
```

Backend runs on `http://127.0.0.1:8000` (note: use `127.0.0.1`, not `localhost` to avoid IPv6 issues).

### Proxy Configuration

Frontend proxies `/api` requests to backend via Vite config:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true
    }
  }
}
```

## Code Quality Tools

### Biome (Linter + Formatter)

This project uses **Biome** instead of ESLint/Prettier for:
- Faster linting (100x faster than ESLint)
- Unified tooling (lint + format in one)
- Better error messages
- Zero configuration needed

**Usage:**
```bash
bun run lint              # Check for issues
bun run lint:fix          # Auto-fix issues
bun run format            # Format code
```

**Configuration**: `biome.json` at project root

### Deprecated Tools

- ❌ ESLint (legacy config exists but deprecated)
- ❌ Prettier (replaced by Biome)

## Hardware Context

### ESP32-C3 Firmware

- **Language**: C++/Arduino
- **IDE**: Arduino IDE 2.x
- **Core**: ESP32 Arduino Core 2.0.17
- **Communication**: WiFi + JSON API

**Note**: Firmware uses manual JSON parsing (not ArduinoJson library) due to version compatibility issues.

### Network Configuration

- ESP32 connects to local WiFi
- Backend needs ESP32 IP in `.env` file
- Frontend → Backend → ESP32 communication chain

## Development Workflow

### First Time Setup

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Install dependencies
bun install

# 3. Start frontend
bun run dev:frontend

# 4. Start backend (separate terminal)
cd backend && uvicorn main:app --reload
```

### Typical Development Session

```bash
# Terminal 1: Frontend
bun run dev

# Terminal 2: Backend
cd backend && uvicorn main:app --reload

# Terminal 3: Storybook (optional)
cd frontend && bun run storybook
```

### Testing with Storybook and Chrome DevTools

Storybook runs on port **6006** and integrates with Chrome DevTools for component testing and debugging.

#### Starting Storybook

```bash
# From frontend directory
cd frontend
bun run storybook

# Or from root
bun run storybook --cwd frontend
```

Storybook will start at `http://localhost:6006`

#### Using Chrome DevTools

1. **Open Storybook**: Navigate to `http://localhost:6006` in Chrome
2. **Open DevTools**: Press `F12` or right-click → "Inspect"
3. **Test Components**:
   - Use **Console** tab for component state debugging
   - Use **Elements** tab for DOM inspection
   - Use **Network** tab to monitor API calls
   - Use **Performance** tab for render performance analysis

#### If Port 6006 is Already in Use

**Check what's using the port:**
```bash
lsof -ti:6006
```

**Kill the process:**
```bash
lsof -ti:6006 | xargs kill -9
```

**Then restart Storybook:**
```bash
bun run storybook --cwd frontend
```

#### Storybook + MCP Chrome DevTools

If you have the Chrome DevTools MCP server configured, you can:
- Automate component testing
- Take screenshots of components
- Run accessibility audits
- Test responsive layouts
- Debug component interactions programmatically

**Example workflow:**
```bash
# Terminal 1: Start Storybook
bun run storybook --cwd frontend

# Terminal 2: Use MCP tools to interact with components
# (via Claude Code or other MCP client)
```

### Before Committing

```bash
# Format and lint
bun run format
bun run lint

# Run tests
bun run test:frontend

# Build to verify
bun run build:frontend
```

## Common Troubleshooting

### Issue: "Cannot find module"

**Solution**: Run `bun install` from project root.

### Issue: Frontend can't reach backend

**Causes**:
1. Backend not running on `127.0.0.1:8000`
2. Using `localhost` instead of `127.0.0.1` (IPv6 issue)
3. Proxy config in `vite.config.ts` misconfigured

**Solution**: Verify backend is running, check proxy settings.

### Issue: ESP32 not responding

**Causes**:
1. Wrong IP in `backend/.env`
2. ESP32 not connected to WiFi
3. Firewall blocking requests

**Solution**: Check Arduino Serial Monitor for ESP32 IP, update `.env`, verify network.

### Issue: Bun command not found

**Solution**: Install Bun or add to PATH: `export PATH="$HOME/.bun/bin:$PATH"`

## Design System

This project uses the **Pillar Design System** (available as a Claude Code skill).

### Brand Guidelines

- **Focus**: Accessibility for neurodivergent users and people with disabilities
- **Style**: Modern glassmorphism UI
- **Colors**: Status badges (green = connected, red = disconnected)
- **UX**: Clear visual feedback, minimal cognitive load

### Using Pillar Skill

When implementing UI components, use the `pillar-design-system` skill for:
- Color palettes
- Typography
- Component patterns
- Accessibility guidelines

## Testing Strategy

### Frontend Testing

- **Unit/Component**: Vitest
- **Integration**: Vitest + Playwright (browser testing)
- **Component Development**: Storybook with interaction testing

### Test Execution

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## Version Requirements

### Critical Versions

- **Bun**: ^1.3.13
- **Node.js**: Not required (Bun replaces it)
- **ESP32 Arduino Core**: 2.0.17 (exactly, newer versions have issues)
- **Python**: 3.11+ (for backend)

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- No IE11 support needed

## File Naming Conventions

- **Components**: PascalCase (e.g., `StatusBadge.tsx`)
- **Utilities**: camelCase (e.g., `apiClient.ts`)
- **Stories**: `*.stories.tsx`
- **Tests**: `*.test.tsx` or `*.spec.tsx`
- **Config**: lowercase with dots (e.g., `vite.config.ts`)

## Environment Variables

### Frontend

No `.env` file needed (all config in `vite.config.ts`).

### Backend

`backend/.env`:
```env
ESP32_IP=192.168.1.XXX
```

## AI Agent Best Practices

When working on this codebase:

1. **Always use Bun** for package management and script execution
2. **Use Biome** for linting/formatting, not ESLint/Prettier
3. **Test changes** with `bun run dev` before committing
4. **Check Storybook** for component development workflow
5. **Respect hardware constraints** - ESP32 is resource-limited
6. **Follow accessibility guidelines** - this is for users with disabilities
7. **Use TypeScript strictly** - no `any` types without justification
8. **Update this file** when making architectural decisions

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Vite Documentation](https://vite.dev)
- [Biome Documentation](https://biomejs.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)

## Project Status

**Current Phase**: MVP/POC Development
**Stability**: Experimental
**Production Ready**: No

This is an active development project. Breaking changes may occur.

---

**For questions or clarifications, refer to READMEs in each directory or the main project README.**
