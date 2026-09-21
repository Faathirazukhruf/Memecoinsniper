# Local Setup & Installation Guide

This guide walks you through setting up and running **Memecoinsniper** locally in less than 5 minutes.

---

## 1. Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22.20.0` recommended)
- **pnpm**: `v9.0.0` or higher (`v11.3.0` recommended)
- **Git**

---

## 2. Clone & Install Dependencies

```bash
# Navigate to the workspace
cd Memecoinsniper

# Install all monorepo package dependencies
pnpm install
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Essential Settings for Zero-Cost Local Operation:
Out of the box, public RPC endpoints for Solana, BSC, and Base are pre-configured:

```env
# Solana Mainnet Public RPC / WebSocket
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com

# BSC Mainnet Public RPC
BSC_RPC_URL=https://binance.llamarpc.com
BSC_WS_URL=wss://bsc-rpc.publicnode.com

# Base Mainnet Public RPC
BASE_RPC_URL=https://mainnet.base.org
BASE_WS_URL=wss://base-rpc.publicnode.com
```

### Optional Supabase Cloud Sync:
If you have a Supabase project, populate:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
*(If left empty, the engine automatically runs with its built-in in-memory fallback repository, requiring zero external cloud dependencies).*

### Optional Telegram Alerts:
To receive alerts in your Telegram chat:
1. Message `@BotFather` on Telegram to create a bot and get a token.
2. Message `@userinfobot` to get your Telegram `chat_id`.
3. Set:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_CHAT_ID=123456789
TELEGRAM_ALERTS_ENABLED=true
TELEGRAM_MIN_SCORE=80
```

---

## 4. Running the Engine & Web Terminal

Start both the background engine worker and the Next.js terminal in parallel:

```bash
pnpm dev
```

Or run them in separate terminal tabs:

```bash
# Terminal 1: Background Monitoring Engine
pnpm dev:engine

# Terminal 2: Next.js Terminal Cockpit
pnpm dev:web
```

- **Web Terminal:** [http://localhost:3000](http://localhost:3000)
- **Engine Stream API:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 5. Running Automated Unit Tests

```bash
pnpm test
```
