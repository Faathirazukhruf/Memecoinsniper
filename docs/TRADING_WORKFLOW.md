# Operator Trading Workflow & Routine

This document describes the recommended operational routine for hunting memecoins with **Memecoinsniper**.

---

## 1. The Core 6-Step Hunting Workflow

```
1. ALERT RECEIVED
   ├── Telegram notification or High Score highlighted in Screener.
   │
2. TERMINAL AUDIT (/tokens/[chain]/[address])
   ├── Verify Security Report: Is status PASS? Is mint/freeze revoked?
   ├── Inspect Liquidity & LP Lock percentage.
   ├── Review DexScreener 1m/5m candle volume.
   └── Check Smart Wallet Confluence (Who bought and with what size?).
   │
3. MANUAL EXECUTION
   ├── Click "Trade on DEX" / "Raydium" / "PancakeSwap" / "Uniswap".
   ├── Connect your external browser wallet (Phantom / Rabby / MetaMask).
   └── Review slippage and manually sign the transaction.
   │
4. JOURNAL LOGGING (/journal)
   ├── Click "+ Log Trade".
   ├── Record entry price, position size, Opportunity Score, and entry thesis.
   │
5. POSITION MONITORING & EXIT
   ├── Monitor momentum and volume acceleration.
   └── Execute manual exit on DEX when targets or stop losses are reached.
   │
6. POST-TRADE REFLECTION (/analytics)
   ├── Mark trade CLOSED in Journal, input exit price and realized PnL.
   └── Review Strategy Analytics to identify winning patterns vs losing mistakes.
```

---

## 2. Safety Rules for Operator

- **Rule 1: Never trade a FAIL token.** No matter how high the volume is, if the honeypot or mint test fails, avoid it.
- **Rule 2: Control Position Sizing.** Never allocate more than 1–2% of total hunting capital to a single early-stage memecoin launch.
- **Rule 3: Always Record Lessons.** The journal creates long-term statistical advantage by revealing which scoring factors yield genuine historical edge.
