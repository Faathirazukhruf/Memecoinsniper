# Environment Variables & Configuration Guide

This document provides a comprehensive explanation of every configuration setting available in **Memecoinsniper** (`.env`).

---

## 1. Quick Reference & Mode Toggles

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `string` | `development` | Runtime environment (`development`, `production`, `test`). |
| `PORT` | `number` | `3001` | Port for the background engine REST & SSE stream API. |
| `DEMO_MODE` | `boolean` | `false` | **Crucial:** If `true`, enables mock tokens and offline mode. Disables live RPC streams, DexScreener polling, and Telegram alerts. Useful for initial UI exploration without consuming RPC quotas. |

> [!TIP]
> **Recommended First Run:**
> When running the application for the first time or testing the Next.js cockpit UI, set `DEMO_MODE=true` in `.env`. This ensures zero RPC rate limits and populates demo tokens immediately. Once verified, switch to `DEMO_MODE=false`.

---

## 2. Blockchain RPC Endpoints

Public RPC endpoints work out of the box for lightweight testing, but have strict rate limits (`429 Too Many Requests`) during heavy memecoin market activity.

### Solana
```env
# Solana Mainnet-Beta RPC & WebSocket
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
SOLANA_ENABLED=true
```
* **Recommended Free Provider:** [Helius](https://www.helius.dev/) provides a generous free tier (100k daily credits) with dedicated RPC/WebSocket URLs that virtually eliminate `429` rate limits when decoding Pump.fun and Raydium logs.

### BNB Smart Chain (BSC)
```env
# BSC Mainnet RPC & WebSocket
BSC_RPC_URL=https://binance.llamarpc.com
BSC_WS_URL=wss://bsc-rpc.publicnode.com
BSC_ENABLED=true
```
* **Recommended Free Provider:** [QuickNode](https://www.quicknode.com/) or [PublicNode](https://publicnode.com).

### Base (EVM Layer 2)
```env
# Base Mainnet RPC & WebSocket
BASE_RPC_URL=https://mainnet.base.org
BASE_WS_URL=wss://base-rpc.publicnode.com
BASE_ENABLED=true
```
* **Recommended Free Provider:** [Alchemy](https://www.alchemy.com/) or Base official RPC.

---

## 3. Storage & Database Persistence

The engine employs a **hybrid persistence model**:
1. **Wallet Radar**: Always stored in local atomic JSON storage (`data/wallet-radar.json`).
2. **Tokens, Signals & Trade Journal**: In-memory repository by default, optionally synced to Supabase Cloud PostgreSQL.

```env
# Optional Supabase Database Connection
# If left blank, the engine operates seamlessly using its in-memory repository.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional Custom Path for Wallet Radar File Storage (default: <repo_root>/data/wallet-radar.json)
WALLET_STORE_PATH=
```

---

## 4. Telegram Alert Dispatcher

Receive high-conviction signals directly on your phone via Telegram.

```env
# Master toggle for dispatching Telegram messages
TELEGRAM_ALERTS_ENABLED=false

# Telegram Bot Token from @BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ

# Personal Chat ID or Channel ID from @userinfobot
TELEGRAM_CHAT_ID=123456789

# Minimum Opportunity Score required to trigger a Telegram alert (default: 80)
TELEGRAM_MIN_SCORE=80
```

> [!IMPORTANT]
> - Senders must message `/start` to the bot once in Telegram to permit the bot to send direct messages.
> - The engine includes a built-in **30-minute anti-spam deduplication window** per token address unless the score surges by 10+ points.
> - Non-`PASS` security tokens (e.g. `FAIL` or `UNKNOWN`) are strictly suppressed from Telegram alerts to eliminate false positives.

---

## 5. Scoring & Radar Thresholds

Tune the sensitivity of the hunting radars:

```env
# Minimum Opportunity Score for token visibility in the screener table (0–100)
MIN_OPPORTUNITY_SCORE=50

# Minimum pool liquidity in USD required before scoring (default: $5,000)
MIN_LIQUIDITY_USD=5000

# Minimum 5-minute trading volume in USD
MIN_VOLUME_5M_USD=1000

# Maximum single-side buy or sell tax allowed before flagging as WARN/FAIL (percentage)
MAX_TAX_PERCENT=10

# Maximum percentage of total supply held by top 10 wallets before flagging
MAX_TOP10_HOLDER_PERCENT=50
```

---

## 6. Frontend Configuration (`packages/web`)

```env
# Engine API URL accessed from Next.js browser cockpit
NEXT_PUBLIC_ENGINE_API_URL=http://localhost:3001
```
* When deploying the frontend to Vercel and the engine to a persistent VPS, set `NEXT_PUBLIC_ENGINE_API_URL` on Vercel to your VPS domain or public IP (`http://your-vps-ip:3001`).
