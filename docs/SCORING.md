# Opportunity Scoring Engine (0–100)

This document provides a complete technical breakdown of the deterministic **Opportunity Scoring Algorithm** implemented in [`packages/shared/src/scoring/calculator.ts`](file:///c:/Users/faath/Memecoinsniper/packages/shared/src/scoring/calculator.ts).

---

## 1. Scoring Philosophy

The Opportunity Score is **NOT** an AI black box and is **NOT** a guarantee of profit.
It is a transparent, deterministic ranking metric designed to answer:

> *"Out of all active tokens across Solana, BSC, and Base right now, which ones possess the strongest confluence of safety, momentum, liquidity, and smart-money backing?"*

Every score is accompanied by a **complete breakdown** of sub-scores and human-readable reasoning.

---

## 2. Dimension Weights & Mathematical Rules (Total: 100 Points)

| Dimension | Max Points | Evaluation Conditions & Formula |
| :--- | :---: | :--- |
| **1. Liquidity & LP Lock** | **15 pts** | • If $\text{Liquidity} < \$5,000$: **0 pts** (below minimum safety threshold).<br>• If $\text{Liquidity} \ge \$50,000$: Base $10.5\text{ pts}$ ($70\%$).<br>• If $\text{Liquidity} \ge \$10,000$: Base $9.0\text{ pts}$ ($60\%$).<br>• If $\text{Liquidity} \ge \$5,000$: Base $6.0\text{ pts}$ ($40\%$).<br>• **LP Lock Bonus:** Up to $+4.5\text{ pts}$ ($30\%$) scaled linearly by $\text{LP Locked \%} / 100$. |
| **2. Momentum & Acceleration** | **20 pts** | • Acceleration = $(5\text{m Volume} \times 12) / 1\text{h Volume}$.<br>• If $\text{Acceleration} \ge 3.0\text{x}$: **20 pts** ($100\%$ extreme breakout).<br>• If $\text{Acceleration} \ge 1.8\text{x}$: **16 pts** ($80\%$ strong momentum).<br>• If $\text{Acceleration} \ge 1.0\text{x}$: **10 pts** ($50\%$ steady volume).<br>• If $5\text{m Volume} > \$500$: **6 pts** ($30\%$ early activity).<br>• Otherwise: **0 pts**. |
| **3. Smart Wallet Confluence** | **20 pts** | • If $\ge 3$ smart wallets bought: **20 pts** ($100\%$).<br>• If $2$ smart wallets bought: **16 pts** ($80\%$).<br>• If $1$ smart wallet bought: **14 pts** ($70\%$) if wallet score $\ge 80$, else **10 pts** ($50\%$).<br>• If $0$ smart wallets: **0 pts**. |
| **4. Security & Risk Profile** | **20 pts** | • If Status is `FAIL` or Unverified: **0 pts**.<br>• If Status is `WARN`: **10 pts** ($50\%$).<br>• If Status is `PASS` with revoked mint & freeze: **20 pts** ($100\%$).<br>• If Status is `PASS` standard checks: **17 pts** ($85\%$). |
| **5. Holder Growth & Buyers** | **10 pts** | • If $\ge 30$ unique buyers in $5\text{m}$ (or $1\text{h}$ growth $>50\%$): **10 pts** ($100\%$).<br>• If $\ge 15$ unique buyers in $5\text{m}$: **7 pts** ($70\%$).<br>• If $\ge 5$ unique buyers in $5\text{m}$: **4 pts** ($40\%$).<br>• Otherwise: **1 pt** ($10\%$). |
| **6. Buy / Sell Pressure** | **10 pts** | • Evaluated if total tx $\ge 5$:<br>• If $\text{Buy Ratio} \ge 75\%$: **10 pts** ($100\%$ heavy buy pressure).<br>• If $\text{Buy Ratio} \ge 55\%$: **7 pts** ($70\%$ positive buy balance).<br>• If $\text{Buy Ratio} \ge 40\%$: **4 pts** ($40\%$ balanced trading).<br>• If $\text{Buy Ratio} < 40\%$: **1 pt** ($10\%$ sell pressure dominating).<br>• If $<5$ total tx: **3 pts** ($30\%$). |
| **7. Token Age & Launch Timing** | **5 pts** | • If $\text{Age} \le 15\text{ mins}$: **5 pts** ($100\%$ fresh launch).<br>• If $\text{Age} \le 60\text{ mins}$: **4 pts** ($80\%$ early stage).<br>• If $\text{Age} \le 6\text{ hours}$: **2.5 pts** ($50\%$ mid stage).<br>• If $\text{Age} \le 24\text{ hours}$: **1.5 pts** ($30\%$).<br>• If $> 24\text{ hours}$: **0.5 pts** ($10\%$). |

---

## 3. Concrete Scoring Example (Token "SOLCAT")

Let's trace how a newly launched token achieves an Opportunity Score of **87 / 100**:

- **Token:** `SOLCAT` on Solana
- **Liquidity:** \$35,000 with 100% Raydium LP burned $\rightarrow$ **13.5 / 15 pts**
- **5m Volume:** \$42,000 (pace is 3.5x hourly average) $\rightarrow$ **20 / 20 pts**
- **Smart Wallets:** 2 tracked alpha wallets bought $\rightarrow$ **16 / 20 pts**
- **Security:** Status `PASS`, mint authority revoked, freeze revoked $\rightarrow$ **20 / 20 pts**
- **Holders:** 22 unique buyers in the last 5 minutes $\rightarrow$ **7 / 10 pts**
- **Buy Pressure:** 28 buys vs 9 sells ($75.6\%$ buy ratio) $\rightarrow$ **10 / 10 pts**
- **Token Age:** Launched 8 minutes ago $\rightarrow$ **5 / 5 pts**

$$\text{Total Score} = 13.5 + 20 + 16 + 20 + 7 + 10 + 5 = 91.5 \rightarrow \mathbf{92} \text{ / } 100$$
- **Mode:** `#SMART_MONEY` (triggered by smart wallet confluence)
- **Priority:** **HIGH PRIORITY ALERT** (Total $\ge 80$ and Security is `PASS`).

---

## 4. Opportunity Modes

The engine classifies each scored signal into an Opportunity Mode based on its dominant catalyst:

1. **`#SMART_MONEY`:** Triggered when $\ge 1$ high-scoring smart wallet ($\ge 80$ score) accumulates the token.
2. **`#MOMENTUM`:** Triggered when volume acceleration $\ge 3\text{x}$ with strong buy-side pressure, even before smart wallets enter.
3. **`#NEW_LAUNCH`:** Freshly deployed tokens ($<15$ mins old) with newly established liquidity pools and initial buyer momentum.

---

## 5. Telegram Alert Thresholds & Anti-Spam

- **Screener Visibility:** Total Score $\ge 50$.
- **High-Priority Alert Dispatch:** Total Score $\ge 80$ with Security Status `PASS`.
- **Anti-Spam Deduplication:** The engine suppresses duplicate alerts for the same token address for **30 minutes**, unless the score surges by $\ge 10$ points.
- **Fail-Safe Suppression:** Tokens with security status `FAIL` or `UNKNOWN` are **never** alerted to Telegram.
