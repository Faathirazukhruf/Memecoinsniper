# Troubleshooting & Operational Guide

This document lists common operational issues, RPC hiccups, terminal errors, and their step-by-step resolutions.

---

## 1. Blockchain RPC Issues

### A. Solana Public RPC Rate Limiting (`429 Too Many Requests`)
- **Symptom:** Console displays `429 Too Many Requests` or fails to fetch token account data.
- **Cause:** Free public Solana RPC (`api.mainnet-beta.solana.com`) has strict rate limits during market volatility.
- **Solution:**
  - Create a free account on **Helius** ([helius.dev](https://www.helius.dev/)), **QuickNode**, or **Alchemy**.
  - Update `SOLANA_RPC_URL` and `SOLANA_WS_URL` in `.env` with your dedicated RPC/WS endpoints.
  - Or switch to `DEMO_MODE=true` to test without hitting external RPCs.

### B. EVM WebSocket Connection Drops (BSC / Base)
- **Symptom:** `WebSocket connection closed` in engine console.
- **Behavior:** The engine's `BaseChainAdapter` automatically catches drops and applies exponential backoff with jitter to reconnect within seconds.
- **Manual Fix:** Verify that `BSC_WS_URL` and `BASE_WS_URL` in `.env` point to responsive endpoints (e.g. `wss://bsc-rpc.publicnode.com` and `wss://base-rpc.publicnode.com`).

---

## 2. High Event Volume & Console Flooding

- **Symptom:** Terminal is rapidly flooded with hundreds of `[Token Radar] New token detected: PUMP on solana (...)` messages every minute.
- **Cause:** Pump.fun creates tens of tokens every minute on Solana mainnet. The Solana adapter decodes `Instruction: Create` events in real-time.
- **Solution:**
  - This is expected behavior in live mode (`DEMO_MODE=false`). Only tokens that achieve $\ge 80$ Opportunity Score with `PASS` security generate Telegram alerts.
  - To silence log noise during UI development or testing, switch `DEMO_MODE=true` in `.env`.

---

## 3. Supabase Cloud Connection Issues

- **Symptom:** `[Supabase] Failed to upsert token to cloud, stored locally`.
- **Behavior:** The engine seamlessly switches to its built-in in-memory fallback adapter. No data is lost from the active terminal session.
- **Fix:** Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` match your Supabase project settings, or leave them empty to run in zero-cloud local mode.

---

## 4. Telegram Alert Issues

- **Symptom:** High-priority opportunities are logged in the terminal, but no Telegram message arrives.
- **Fix:**
  1. Ensure `TELEGRAM_ALERTS_ENABLED=true` in `.env`.
  2. Send `/start` to your bot in Telegram so it has permission to message your account.
  3. Verify `TELEGRAM_CHAT_ID` matches your user/channel ID (get it via `@userinfobot`).
  4. Note that deduplication suppresses alerts for the same token within a 30-minute window unless the score increases by $\ge 10$ points.
  5. Tokens with security status `WARN`, `FAIL`, or `UNKNOWN` are strictly withheld from Telegram.

---

## 5. Port Conflicts & Dangling Processes

- **Symptom:** `Error: listen EADDRINUSE: address already in use :::3001` (Engine) or `:::3000` (Next.js).
- **Fix:**
  - Change `PORT=3002` in `.env` for the engine.
  - Or terminate the old dangling Node processes:
    - **Windows (PowerShell):** `Stop-Process -Name node -Force` or `taskkill /F /IM node.exe`
    - **Linux / macOS:** `killall node`

---

## 6. Wallet Radar Local Storage (`data/wallet-radar.json`)

- **Symptom:** `Wallet storage unavailable` or write errors on startup.
- **Fix:**
  - Ensure the `data/` directory exists in the workspace root or can be created by the process.
  - If using a custom path, ensure `WALLET_STORE_PATH` in `.env` is an absolute path with write permissions.
  - Ensure only **one** engine process accesses `data/wallet-radar.json` at a time.
