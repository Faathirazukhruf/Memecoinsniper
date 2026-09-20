# Database Design & Supabase Schema

This document details the database schema, tables, indices, and data lifecycle management for **Memecoinsniper**.

---

## 1. Schema Overview

The database is powered by **PostgreSQL** (hosted via Supabase) and is strictly normalized for fast query performance and minimal storage footprint.

All migrations are stored in:
`packages/engine/supabase/migrations/001_initial_schema.sql`

---

## 2. Table Specifications

### 1. `chains`
Stores supported blockchain networks.
- `id` (VARCHAR(32), PK): `'solana'`, `'bsc'`, `'base'`
- `name` (VARCHAR(64)): Human-readable chain name
- `native_currency` (VARCHAR(16)): `'SOL'`, `'BNB'`, `'ETH'`
- `explorer_url` (TEXT): Block explorer base URL
- `enabled` (BOOLEAN): Master toggle

### 2. `tokens`
Stores discovered tokens across all chains.
- `id` (UUID, PK)
- `chain_id` (VARCHAR(32), FK): Associated chain
- `address` (VARCHAR(128)): Contract or Mint address
- `symbol` (VARCHAR(32)): Token symbol
- `name` (VARCHAR(128)): Full token name
- `decimals` (INTEGER): Token decimals
- `total_supply` (TEXT): Total supply
- `deployer_address` (VARCHAR(128)): Creator wallet
- `created_at_chain` (TIMESTAMPTZ): Block creation timestamp
- `detected_at` (TIMESTAMPTZ): Engine discovery timestamp
- *Constraint:* UNIQUE (`chain_id`, `address`)

### 3. `pools`
Stores liquidity pools (Raydium, PancakeSwap, Uniswap v3).
- `id` (UUID, PK)
- `chain_id` (VARCHAR(32), FK)
- `address` (VARCHAR(128)): Pool contract address
- `dex` (VARCHAR(64)): Name of DEX
- `base_token_address` (VARCHAR(128))
- `quote_token_address` (VARCHAR(128))
- `initial_liquidity_usd` (NUMERIC(18, 4))
- `current_liquidity_usd` (NUMERIC(18, 4))
- `lp_locked_or_burned` (BOOLEAN)
- `lp_locked_percentage` (NUMERIC(5, 2))

### 4. `token_snapshots`
Periodic metrics snapshots for tracking volume acceleration and momentum surges.
- `token_address`, `chain_id`, `price_usd`, `liquidity_usd`, `market_cap_usd`
- `volume_5m_usd`, `volume_1h_usd`, `volume_24h_usd`, `tx_count_5m`
- `unique_buyers_5m`, `holders_count`, `snapshot_time`

### 5. `security_checks`
Stores deterministic contract security audit results.
- `token_address`, `chain_id`, `status` (`'PASS'`, `'WARN'`, `'FAIL'`, `'UNKNOWN'`)
- `risk_score` (INTEGER 0–100), `is_honeypot`, `buy_tax_percentage`, `sell_tax_percentage`
- `is_mintable`, `is_freezable`, `is_lp_locked_or_burned`, `flags` (JSONB)

### 6. `wallets` & `wallet_metrics`
Tracks smart/alpha trader behavior and reconstructed performance statistics.
- `address`, `chain_id`, `label`, `category`, `smart_score` (0–100), `is_watchlisted`
- `win_rate`, `avg_roi_multiple`, `profit_factor`, `realized_pnl_usd`, `early_entry_rate`

### 7. `signals`
Generated high-probability trading opportunities.
- `id` (UUID, PK), `token_address`, `chain_id`, `mode`, `total_score` (0–100)
- `score_breakdown` (JSONB), `security_report` (JSONB), `trigger_reason`, `telegram_alert_sent`

### 8. `trades`
Operator manual trade journal.
- `token_address`, `chain_id`, `status` (`'OPEN'`, `'CLOSED'`, `'CANCELLED'`)
- `position_size_usd`, `entry_price_usd`, `exit_price_usd`, `roi_multiple`, `realized_pnl_usd`
- `entry_reason`, `notes`, `lessons_learned`, `tags`

---

## 3. Data Retention & Cleanup Policy

To maintain Supabase free tier storage limits (<500MB):
- Periodic cleanup deletes `token_snapshots` older than 7 days.
- `alert_logs` deduplication entries are retained for 72 hours.
- Core `tokens`, `signals`, and operator `trades` are retained permanently.
