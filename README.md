# Personal Multi-Chain Memecoin Hunting Engine (`Memecoinsniper`)

> **A high-speed, data-driven personal trading intelligence terminal for Solana, BSC, and Base.**

![Terminal Overview](https://img.shields.io/badge/Architecture-Clean%20Monorepo-blue)
![TypeScript](https://img.shields.io/badge/Language-TypeScript%20Strict-green)
![Execution](https://img.shields.io/badge/Trading-100%25%20Manual%20(No%20Keys%20Stored)-brightgreen)
![Chains](https://img.shields.io/badge/Chains-Solana%20%7C%20BSC%20%7C%20Base-purple)

---

## Current implementation status

Live mode is the default (`DEMO_MODE=false`). Synthetic startup tokens and example wallets are only available with `DEMO_MODE=true`; demo mode uses memory storage and disables chain listeners, the live market feed, and Telegram alerts. The UI labels demo and offline states.

Security failures and missing evidence remain `UNKNOWN`; only `PASS` reports can generate Telegram alerts. Pool-specific lock verification is not implemented, so live reports may remain `UNKNOWN` and alerts are intentionally suppressed. Analytics use recorded journal results, with missing data shown explicitly.

This is still a research prototype: chain decoding, market estimates, durable journal recovery, and strategy validation require further work before real-money use.

## 🎯 Product Vision & Philosophy

**Memecoinsniper** is a personal hunting terminal designed to reduce thousands of raw blockchain events per minute into a handful of high-probability opportunities that deserve human trading attention.

```
COVER THE MARKET → FILTER THE GARBAGE → FIND SMART MONEY → DETECT MOMENTUM → RANK OPPORTUNITIES → MOVE FAST → RECORD EVERYTHING → LEARN FROM RESULTS
```

### Core Tenets:
1. **No Overengineering:** Single engine process + Supabase database + Next.js terminal + Telegram alert bot. No microservices, Kafka, or Kubernetes.
2. **Deterministic Mathematical Scoring:** 0–100 Opportunity Score with transparent point breakdowns and plain-English reasoning. No black-box AI.
3. **100% Manual Execution (V1):** The engine does NOT store private keys or execute automated swaps. It prepares deep-links for operator review and signing.
4. **Smart Wallet Confluence:** Tracks alpha traders and detects coordinated smart-money accumulations.
5. **Rigorous Security Filtering:** Evaluates honeypots, mint/freeze authorities, buy/sell taxes, LP locks, and holder concentration.

---

## 🏗️ Architecture Summary

```
                      Multi-Chain Blockchains
                      (Solana, BSC, Base)
                               │ RPC / WS
                               ▼
                        Chain Adapters
                               │ Normalized Events
                               ▼
               ┌───────────────┴───────────────┐
               ▼                               ▼
       New Launch Radar               Smart Wallet Radar
               └───────────────┬───────────────┘
                               ▼
                     Security / Risk Engine
                               ▼
                      Market Intelligence
                               ▼
                     Opportunity Scoring
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       Supabase Database               Telegram Alerts
               │
               ▼
     Next.js Web Cockpit
```

---

## 📂 Monorepo Structure

```
├── packages/
│   ├── shared/         # Common TypeScript types, mathematical scoring, security rules, wallet metrics
│   ├── engine/         # Blockchain adapters (Solana, BSC, Base), radars, scoring, DB persistence, Telegram bot
│   └── web/            # Next.js 14+ dark terminal cockpit (Dashboard, Screener, Detail, Wallets, Journal, Analytics)
├── docs/               # In-depth architectural, setup, and trading guides
├── tests/              # Vitest test suites (scoring, security, wallet metrics, normalization)
└── README.md           # Master project overview & quickstart
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Suite
Run both the engine background worker and the Next.js frontend in parallel:
```bash
pnpm dev
```

- **Frontend Cockpit:** [http://localhost:3000](http://localhost:3000)
- **Engine Stream & API:** [http://localhost:3001](http://localhost:3001)

### 4. Run Automated Test Suite
```bash
pnpm test
```

---

## 📚 Documentation Index (`/docs`)

All detailed technical documentation is organized in the [`docs/`](file:///c:/Users/faath/Memecoinsniper/docs) folder:

- [docs/ARCHITECTURE.md](file:///c:/Users/faath/Memecoinsniper/docs/ARCHITECTURE.md) — System design, dataflow pipelines, process model.
- [docs/SETUP.md](file:///c:/Users/faath/Memecoinsniper/docs/SETUP.md) — Step-by-step local development and environment setup guide.
- [docs/DEPLOYMENT.md](file:///c:/Users/faath/Memecoinsniper/docs/DEPLOYMENT.md) — Free/low-cost deployment strategies (Vercel, Supabase, VPS worker).
- [docs/DATABASE.md](file:///c:/Users/faath/Memecoinsniper/docs/DATABASE.md) — PostgreSQL schema, migrations, indices, and data lifecycle.
- [docs/CHAINS.md](file:///c:/Users/faath/Memecoinsniper/docs/CHAINS.md) — Multi-chain adapter specifications for Solana, BSC, Base.
- [docs/WALLET_INTELLIGENCE.md](file:///c:/Users/faath/Memecoinsniper/docs/WALLET_INTELLIGENCE.md) — Wallet reconstruction, smart scores, metrics calculation.
- [docs/SCORING.md](file:///c:/Users/faath/Memecoinsniper/docs/SCORING.md) — Mathematical Opportunity Scoring formula (0-100) and weight allocation.
- [docs/SECURITY.md](file:///c:/Users/faath/Memecoinsniper/docs/SECURITY.md) — Security check rules, honeypot analysis, risk flags.
- [docs/TRADING_WORKFLOW.md](file:///c:/Users/faath/Memecoinsniper/docs/TRADING_WORKFLOW.md) — Operator trading routine, signal filtering, manual journal logging.
- [docs/TROUBLESHOOTING.md](file:///c:/Users/faath/Memecoinsniper/docs/TROUBLESHOOTING.md) — RPC rate limits, WebSocket disconnects, common solutions.
