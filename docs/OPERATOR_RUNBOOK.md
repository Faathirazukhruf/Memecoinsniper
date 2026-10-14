# Operator Runbook & Quick-Trading Manual

> **High-speed, data-driven memecoin hunting guidelines for single-operator execution.**

---

## 1. Pre-Session Checklist (5 Minutes Before Trading)

Before opening trading terminal positions:

1. **Verify Engine Health**:
   - Open [http://localhost:3001/api/health](http://localhost:3001/api/health).
   - Ensure all desired chain adapters (`solana`, `bsc`, `base`) report `"isConnected": true`.
2. **Check RPC Quotas**:
   - If using Helius / Alchemy free tiers, ensure you have sufficient daily credits remaining.
3. **Verify Telegram Alerts**:
   - Ensure your Telegram bot is active and you have sent `/start` to the bot.
4. **Prepare Hot Wallets & Gas**:
   - Ensure your browser wallet (Phantom for Solana, Rabby / MetaMask for EVM) has native gas available ($20–$50 in SOL/BNB/ETH).
   - **Never use a primary cold storage wallet for memecoin sniping.** Use dedicated burner hot wallets.

---

## 2. Instant Execution Deep-Links

Since Memecoinsniper V1 operates on **100% manual execution**, you need to execute within 3 to 15 seconds of receiving an alert. 

The web terminal provides instant links for every token. Use the right platform for each chain:

### Solana
- **Photon SOL**: High-speed sniping terminal with instant MEV-protected priority transactions (`https://photon-sol.tinyastro.io/en/r/@operator/{tokenAddress}`).
- **BullX**: Fast memecoin DEX aggregator with live pump charts (`https://bullx.io/terminal?chainId=1399811149&address={tokenAddress}`).
- **Axiom / Trojan on Solana**: Fast Telegram trading bot for instant 1-click execution.
- **Raydium Swap**: Native swap interface (`https://raydium.io/swap/?outputMint={tokenAddress}`).

### BSC & Base
- **DexScreener**: Instant chart & built-in multichain swap routing (`https://dexscreener.com/{chain}/{pairAddress}`).
- **PancakeSwap** (BSC): Native AMM interface (`https://pancakeswap.finance/swap?outputCurrency={tokenAddress}`).
- **Uniswap v3** (Base): Native Base swap interface (`https://app.uniswap.org/swap?chain=base&outputCurrency={tokenAddress}`).

---

## 3. Slippage, Priority Gas & MEV Protection

Memecoins experience high volatility and toxic MEV sandwich bots during early launch seconds.

| Parameter | Recommended Setting | Rationale |
| :--- | :--- | :--- |
| **Slippage Tolerance** | **5% to 15%** | Under 3% will frequently fail during breakout candles. Over 20% invites devastating MEV sandwiches. |
| **Priority Gas Fee (Solana)** | **0.002 – 0.005 SOL** | Ensures inclusion in the next block ahead of competing snipers. |
| **Priority Gas Fee (Base/BSC)** | **1.2x – 1.5x current Gwei** | Prevents transaction hanging in the mempool. |
| **MEV Protection** | **Enabled (Jito on Solana / Flashbots on EVM)** | Guarantees transaction bundles bypass the public mempool. |

---

## 4. Strict Risk Management Framework

Memecoin hunting is a game of positive expected value ($+EV$) across asymmetric bets:

```
[ Small Controlled Loss ] x 7  +  [ Break-even ] x 2  +  [ 5x–20x Runner ] x 1  =  Net Profitable
```

### 3 Non-Negotiable Rules:

1. **Max Allocation Per Trade: 1%–2% of Portfolio**:
   - If your hunting bankroll is $1,000, your max size per position is $10–$20.
   - If your hunting bankroll is $5,000, your max size per position is $50–$100.
2. **Hard Stop Loss: -35% to -50%**:
   - If liquidity drops or sell volume dominates, exit immediately. **Never average down on a losing memecoin.**
3. **The 3-Tier Take-Profit Ladder**:
   - **Target 1 (+100% / 2x):** Sell 50% of the position. Your initial capital is completely de-risked ("playing with house money").
   - **Target 2 (+300% / 4x):** Sell an additional 25%.
   - **Target 3 (Moonbag):** Leave the remaining 25% with a trailing stop-loss to capture parabolic breakout runs.

---

## 5. Trade Journaling & Continuous Learning

After closing or exiting a position:

1. Navigate to `/journal` on the Next.js cockpit.
2. Click **"+ Log Trade"** or update the existing open trade.
3. Record:
   - Opportunity Score at entry (e.g. `87`).
   - Opportunity Mode (`#NEW_LAUNCH`, `#SMART_MONEY`, `#MOMENTUM`).
   - Exit price and realized PnL in USD.
   - **Lessons Learned:** Did the token rug? Was slippage too high? Did smart wallets dump early?
4. Review `/analytics` weekly to see which opportunity modes and score ranges deliver the highest win rate.
