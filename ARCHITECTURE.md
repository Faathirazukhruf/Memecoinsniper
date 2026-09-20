# System Architecture

## 1. Overview & Principles

The **Personal Multi-Chain Memecoin Hunting Engine** is designed around single-operator efficiency, minimal infrastructure complexity, and zero tolerance for overengineering.

### Principles:
- **No Microservices:** A single persistent Node.js process manages all chain listeners, state aggregation, scoring, and alerting.
- **Process-Level Fault Isolation:** If one blockchain RPC or network drops, other chains continue operating seamlessly.
- **Normalized Multi-Chain Model:** Raw chain events from Solana, BSC, and Base are transformed into uniform `NormalizedEvent` structures before entering the intelligence pipeline.

---

## 2. End-to-End Dataflow Pipeline

```
[ Solana RPC/WS ]    [ BSC RPC/WS ]    [ Base RPC/WS ]
        │                  │                  │
        ▼                  ▼                  ▼
[ SolanaAdapter ]   [ BscAdapter ]    [ BaseAdapter ]
        └──────────────────┬──────────────────┘
                           ▼
                 [ Event Normalizer ]
             (TOKEN_CREATED, POOL_CREATED,
              LIQUIDITY_ADDED, SWAP, WALLET_BUY)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    [ Token Radar ]             [ Wallet Radar ]
             │                           │
             └─────────────┬─────────────┘
                           ▼
                [ Security / Risk Engine ]
             (Honeypot, Mint, Freeze, Taxes)
                           ▼
                 [ Market Intelligence ]
             (Volume, Acceleration, Buyers)
                           ▼
               [ Opportunity Scoring ]
             (Deterministic 0-100 Calc)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
   [ Supabase DB Persistence ]  [ Telegram Notifier ]
             │                  (Priority Filter & Dedup)
             ▼
   [ Next.js Web Cockpit ]
 (Dashboard / Screener / Detail /
  Wallets / Journal / Analytics)
```

---

## 3. Package Responsibilities

### `@memesniper/shared`
- Pure TypeScript interfaces and types.
- Deterministic opportunity scoring calculation algorithms (`calculateOpportunityScore`).
- Deterministic security evaluation logic (`evaluateSecurity`).
- Wallet metrics and statistical formulas (`calculateWalletMetrics`).
- Default configuration constants and thresholds.

### `@memesniper/engine`
- Long-running background worker (`src/index.ts`).
- Multi-chain adapters (`chains/solana`, `chains/bsc`, `chains/base`).
- Real-time radars (`TokenRadar`, `WalletRadar`).
- In-memory aggregation & Supabase cloud sync (`src/db/supabase.ts`).
- Telegram Bot Alert Dispatcher with anti-spam deduplication (`src/services/telegram-notifier.ts`).
- REST API server (`src/server.ts`) servicing the web terminal.

### `@memesniper/web`
- Next.js 14+ App Router terminal cockpit.
- High-density dark UI with Tailwind CSS and Lucide icons.
- Real-time polling and interactive modals (Score breakdown, Security report, Wallet details).
- Operator trade journal and strategy analytics engine.

---

## 4. Latency Tracking & Monitoring

The engine captures internal timestamps across the pipeline lifecycle:
1. `event_timestamp`: Time transaction occurred on-chain.
2. `detected_timestamp`: Time adapter received and decoded log.
3. `analysis_completed_timestamp`: Time security scan & market metrics resolved.
4. `alert_timestamp`: Time Telegram alert was dispatched.

Detection and signal latencies are logged in ms to guarantee sub-second execution alerts.
