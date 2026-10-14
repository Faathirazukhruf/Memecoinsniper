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
# Clone the repository
git clone https://github.com/Faathirazukhruf/Memecoinsniper.git
cd Memecoinsniper

# Install all monorepo package dependencies
pnpm install
```

---

## 3. Environment Configuration

Create `.env` from the provided example template:

- **Linux / macOS / Git Bash:**
  ```bash
  cp .env.example .env
  ```
- **Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```

> [!TIP]
> **Recommended First Run: Use Demo Mode**
> In `.env`, set `DEMO_MODE=true` during your initial setup. This seeds demo tokens and wallets into the web UI without consuming external RPC quotas or getting rate-limited by public endpoints. Once you are comfortable with the interface, switch to `DEMO_MODE=false`.
>
> For full details on all settings, see the [Configuration Guide](CONFIG_ENV.md).

### Essential Public RPC Settings:
Out of the box, public RPC endpoints for Solana, BSC, and Base are pre-configured in `.env.example`:

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

> [!NOTE]
> During high market activity (e.g. Pump.fun surges), public Solana RPCs may return `429 Too Many Requests`. For live trading, obtain a free private RPC key from [Helius](https://www.helius.dev/) or [Alchemy](https://www.alchemy.com/).

### Optional Cloud & Alert Services:
- **Supabase Cloud Sync:** If you leave Supabase keys blank, the engine automatically runs using its high-speed in-memory repository with zero external setup.
- **Telegram Bot Alerts:** Message `@BotFather` to create a bot, set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `TELEGRAM_ALERTS_ENABLED=true`.

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

- **Web Terminal Cockpit:** [http://localhost:3000](http://localhost:3000)
- **Engine Stream & API:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 5. Running Automated Unit Tests & Typechecks

```bash
# Run unit test suites (scoring, security, wallet metrics, normalization)
pnpm test

# Run TypeScript typechecks across all monorepo packages
pnpm typecheck
```

---

## 6. Next Steps

- Consult the [Operator Runbook](OPERATOR_RUNBOOK.md) for execution deep-links and risk management.
- Check the [API Reference](API_REFERENCE.md) for REST and SSE stream specifications.
- Read [Troubleshooting](TROUBLESHOOTING.md) if you encounter RPC rate limits or port collisions.
