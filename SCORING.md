# Opportunity Scoring Engine (0–100)

This document provides a breakdown of the deterministic Opportunity Scoring algorithm used to rank multi-chain memecoin opportunities.

---

## 1. Scoring Philosophy

The Opportunity Score is **NOT** an AI black box and is **NOT** a guarantee of profit.
It is a transparent, deterministic ranking metric designed to answer:

> *"Out of all active tokens across Solana, BSC, and Base right now, which ones possess the strongest confluence of safety, momentum, liquidity, and smart-money backing?"*

Every score is accompanied by a **complete breakdown** of sub-scores and human-readable reasoning.

---

## 2. Dimension Weights & Breakdown (Total: 100 Points)

| Dimension | Max Points | Evaluation Factors |
| :--- | :--- | :--- |
| **Liquidity & LP Lock** | **15 pts** | Liquidity depth between \$10k–\$200k + LP token burn/lock verification percentage. |
| **Momentum & Volume** | **20 pts** | 5-minute volume velocity relative to 1-hour average ($>3\text{x}$ breakout = full score). |
| **Smart Wallet Confluence** | **20 pts** | Number and quality of tracked smart wallets holding/buying the token. |
| **Security & Risk** | **20 pts** | Honeypot status, buy/sell taxes ($<5\%$), revoked mint/freeze authorities. |
| **Holder Growth Velocity** | **10 pts** | Unique buyer count in last 5m and holder expansion velocity. |
| **Buy / Sell Pressure** | **10 pts** | Ratio of buys to total transactions ($>75\%$ buys = full score). |
| **Token Age & Timing** | **5 pts** | Freshness of launch ($<15$ mins old gets maximum timing points). |

---

## 3. Opportunity Modes

The engine classifies each scored signal into an Opportunity Mode:

1. **`#NEW_LAUNCH`:** Freshly deployed tokens with newly established liquidity pools and initial buyer momentum.
2. **`#SMART_MONEY`:** Tokens experiencing sudden accumulation from one or more high-scoring smart wallets.
3. **`#MOMENTUM`:** Established tokens exhibiting explosive volume acceleration ($>3\text{x}$) and buy-side imbalance.

---

## 4. Telegram Alert Thresholds

- **Standard Signal:** Total Score $\ge 70$ (Visible in Screener).
- **High-Priority Alert:** Total Score $\ge 85$ with Security Status `PASS` (Dispatched instantly to Telegram).
- **Spam Prevention:** Deduplication window suppresses duplicate alerts for the same token for 30 minutes unless score increases by $\ge 10$ points.
