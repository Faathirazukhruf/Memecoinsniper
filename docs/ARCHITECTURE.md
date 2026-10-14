# System Architecture

## 1. Overview & Principles

The **Personal Multi-Chain Memecoin Hunting Engine** is designed around single-operator efficiency, minimal infrastructure complexity, and zero tolerance for overengineering.

### Principles:
- **No Microservices:** A single persistent Node.js process manages all chain listeners, market feeds, state aggregation, scoring, and alerting.
- **Process-Level Fault Isolation:** If one blockchain RPC or network drops, other chains continue operating seamlessly with automatic exponential backoff reconnection.
- **Normalized Multi-Chain Model:** Raw chain events from Solana, BSC, and Base are transformed into uniform `NormalizedEvent` structures before entering the intelligence pipeline.
- **Hybrid Local-First Persistence:** Heavy high-frequency wallet history is kept locally on disk without inflating cloud databases, while strategic trade records sync to Supabase.

---

## 2. End-to-End Dataflow Pipeline

```
 ┌───────────────────────────────┐        ┌───────────────────────────────┐
 │   On-Chain RPC / WebSockets   │        │     Live Market Feed API      │
 │    (Solana, BSC, Base)        │        │   (DexScreener + GoPlus API)  │
 └──────────────┬────────────────┘        └──────────────┬────────────────┘
                │ Raw Logs / Blocks                      │ Fast Pairs / Security
                ▼                                        ▼
   ┌───────────────────────────┐           ┌───────────────────────────┐
   │    Multi-Chain Adapters   │           │   LiveMarketFeedService   │
   │ (Solana, Bsc, BaseAdapter)│           │  (Polling & Pair Discovery│
   └────────────┬──────────────┘           └─────────────┬─────────────┘
                │ Normalized Events                      │ Live Opportunities
                └───────────────────┬────────────────────┘
                                    ▼
                          [ Event Normalizer ]
                      (TOKEN_CREATED, POOL_CREATED,
                       LIQUIDITY_ADDED, SWAP, WALLET_BUY)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           [ Token Radar ]                 [ Wallet Radar ]
          (New Pairs & Pools)             (Alpha Wallets, RPC Sync,
                    │                      FIFO Positions & Basis)
                    │                               │
                    └───────────────┬───────────────┘
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
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       [ Dual Persistence Engine ]         [ Telegram Alert Bot ]
      ┌─────────────────────────┐         (Score >= 80, Security PASS,
      │• Wallets: Local JSON    │          30m anti-spam dedup)
      │  (data/wallet-radar.json│
      │• Tokens, Signals, Trades│
      │  Supabase + In-Memory   │
      └────────────┬────────────┘
                   │
                   ▼
       [ REST & SSE Stream Server ]
            (/api/stream, /api/*)
                   │
                   ▼
         [ Next.js Web Cockpit ]
     (Dashboard / Screener / Detail /
      Wallets / Journal / Analytics)
```

---

## 3. Package Responsibilities

### `@memesniper/shared`
- Pure TypeScript interfaces, entities, and types.
- Deterministic opportunity scoring calculation algorithms ([calculator.ts](file:///c:/Users/faath/Memecoinsniper/packages/shared/src/scoring/calculator.ts)).
- Deterministic security evaluation logic ([evaluator.ts](file:///c:/Users/faath/Memecoinsniper/packages/shared/src/security/evaluator.ts)).
- Wallet metrics and statistical formulas ([metrics.ts](file:///c:/Users/faath/Memecoinsniper/packages/shared/src/wallet/metrics.ts)).
- Monorepo-wide default configuration constants and thresholds.

### `@memesniper/engine`
- Long-running background worker (`src/index.ts`).
- Multi-chain adapters (`chains/solana`, `chains/bsc`, `chains/base`).
- Real-time live market feed service (`src/services/live-feed-service.ts`) integrating DexScreener & GoPlus APIs for multi-chain discovery.
- Radars:
  - `TokenRadar`: Discovers new liquidity pools, aggregates 5m volume velocity, calculates deterministic scores, and dispatches alerts.
  - `WalletRadar`: Maintains local tracked alpha wallets, performs RPC transaction catch-up, and calculates FIFO cost basis.
- Hybrid persistence:
  - In-memory aggregation with optional Supabase Cloud sync (`src/db/supabase.ts`).
  - Durable atomic local JSON storage for smart wallets (`data/wallet-radar.json`).
- Telegram Bot Alert Dispatcher with anti-spam deduplication (`src/services/telegram-notifier.ts`).
- REST & Server-Sent Events (SSE) stream server (`src/server.ts`) broadcasting live token signals (`/api/stream`).

### `@memesniper/web`
- Next.js 14+ App Router terminal cockpit.
- High-density dark UI with Tailwind CSS and Lucide icons.
- Real-time Server-Sent Events (SSE) stream receiver with fallback polling.
- Interactive modals (Score breakdown, Security report, Wallet details).
- Operator trade journal and strategy analytics engine.

---

## 4. Hybrid Persistence & State Architecture

To keep the application fast, reliable, and completely free to run:

1. **Smart Wallet State (`data/wallet-radar.json`)**:
   - Stored locally on the operator machine using atomic file replacements (`tmp` file write followed by `fs.renameSync`).
   - Protects against corruption if the engine process terminates mid-sync.
   - Kept out of version control via `.gitignore`.
2. **Tokens, Pools & Opportunity Signals**:
   - Stored in high-speed in-memory maps (`Map<string, TokenSignal>`).
   - If `SUPABASE_URL` is configured, automatically upserts snapshots into PostgreSQL for historical analysis.
   - If Supabase is offline or unconfigured, the in-memory fallback guarantees 100% functionality without crashes.
3. **Operator Trade Journal**:
   - Stored in memory and synced to Supabase `trades` table when cloud connection is available.

---

## 5. Memory Management & Spam Prevention

Memecoin markets generate tens of thousands of spam transactions per hour. The engine employs three memory safeguards:

1. **LRU Transaction Deduplication**:
   - Each chain adapter maintains an LRU set of processed transaction hashes (up to 5,000 hashes) to prevent duplicate event ingestion.
2. **Alert Deduplication Window**:
   - Dispatched Telegram alerts enter a 30-minute cooldown window per token address. A subsequent alert is only dispatched if the Opportunity Score increases by $\ge 10$ points.
3. **Periodic Snapshot Pruning**:
   - In-memory metric buffers only retain sliding 5-minute and 1-hour window statistics, preventing unbounded RAM consumption.

---

## 6. Latency Tracking & Monitoring

The engine captures internal timestamps across the pipeline lifecycle:
1. `event_timestamp`: Time transaction occurred on-chain.
2. `detected_timestamp`: Time adapter received and decoded log.
3. `analysis_completed_timestamp`: Time security scan & market metrics resolved.
4. `alert_timestamp`: Time Telegram alert was dispatched.

Detection and signal latencies are logged in milliseconds to guarantee sub-second execution alerts.
