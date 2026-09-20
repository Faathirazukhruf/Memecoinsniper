# Troubleshooting & Operational Guide

This document lists common operational issues, RPC hiccups, and their step-by-step resolutions.

---

## 1. Blockchain RPC Issues

### A. Solana Public RPC Rate Limiting (`429 Too Many Requests`)
- **Symptom:** Logs show `429 Too Many Requests` when querying Solana account info.
- **Cause:** Free public Solana RPC (`api.mainnet-beta.solana.com`) has conservative rate limits during network congestion.
- **Solution:**
  - Create a free account on **Helius**, **QuickNode**, or **Alchemy**.
  - Update `SOLANA_RPC_URL` and `SOLANA_WS_URL` in `.env` with your free private RPC URL.

### B. EVM WebSocket Connection Drops (BSC / Base)
- **Symptom:** `WebSocket connection closed` in engine console.
- **Behavior:** The engine's `BaseChainAdapter` automatically catches drops and applies exponential backoff with jitter to reconnect within seconds.
- **Manual Fix:** Verify that `BSC_WS_URL` and `BASE_WS_URL` in `.env` point to responsive endpoints (e.g. `wss://bsc-rpc.publicnode.com` and `wss://base-rpc.publicnode.com`).

---

## 2. Supabase Cloud Connection Issues

- **Symptom:** `[Supabase] Failed to upsert token to cloud, stored locally`.
- **Behavior:** The engine seamlessly switches to its built-in in-memory fallback adapter. No data is lost from the active terminal session.
- **Fix:** Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` match your Supabase project settings.

---

## 3. Telegram Alert Issues

- **Symptom:** High-priority opportunities are logged in the terminal, but no Telegram message arrives.
- **Fix:**
  1. Ensure `TELEGRAM_ALERTS_ENABLED=true` in `.env`.
  2. Ensure you have sent `/start` to your bot in Telegram so it has permission to message you.
  3. Verify `TELEGRAM_CHAT_ID` matches your user/channel ID.
  4. Remember that deduplication suppresses alerts for the same token within a 30-minute window unless the score changes significantly.

---

## 4. Port Conflicts

- **Symptom:** `Error: listen EADDRINUSE: address already in use :::3001` or `:::3000`.
- **Fix:**
  - Change `PORT=3002` in `.env` for the engine.
  - Or terminate the old dangling Node process:
    - **Windows:** `taskkill /F /IM node.exe`
    - **Linux/Mac:** `killall node`
