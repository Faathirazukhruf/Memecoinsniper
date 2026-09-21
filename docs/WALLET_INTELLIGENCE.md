# Wallet Intelligence & Smart Score Engine

This document details how **Memecoinsniper** tracks, reconstructs, and evaluates profitable wallets without relying on flawed assumptions.

---

## 1. Wallet Classification Categories

To avoid confusing MEV bots or deployers with smart traders, wallets are categorized into:

- `SMART_TRADER`: Consistent profitable entries, reasonable hold times, high ROI multiples.
- `ORDINARY_TRADER`: Regular retail trader.
- `DEPLOYER`: Token creator or project treasury.
- `LP_PROVIDER`: Pure liquidity provider.
- `EXCHANGE`: Centralized exchange deposit/withdrawal hot wallet.
- `MARKET_MAKER`: High-frequency programmatic market making.
- `BOT`: Sandwich/front-running MEV bots.

---

## 2. Wallet Metrics & Calculation Formula

Wallet performance is reconstructed across its closed trading history:

```typescript
export function calculateWalletMetrics(
  walletAddress: string,
  chainId: ChainId,
  trades: WalletTrade[]
): WalletMetrics
```

### Key Dimensions Evaluated:
1. **Win Rate (40% Weight):**
   $$\text{Win Rate} = \frac{\text{Trades with ROI} > 1.05\text{x}}{\text{Total Closed Trades}}$$
2. **Average ROI Multiple (30% Weight):**
   Arithmetic mean of realized multiples across all trades.
3. **Profit Factor (20% Weight):**
   $$\text{Profit Factor} = \frac{\sum \text{Gross Realized Profits}}{\sum \text{Gross Realized Losses}}$$
4. **Early Entry Rate (10% Weight):**
   Percentage of positions entered within the first 5 minutes of token liquidity creation.
5. **Confidence Weighting:**
   Penalizes wallets with fewer than 20 recorded trades to prevent small-sample luck bias.

---

## 3. Real-Time Smart Wallet Confluence Detection

When a new token launches or surges:
1. The **Wallet Radar** checks whether any tracked smart wallet has executed a buy on that token.
2. If multiple smart wallets enter the same token within a short timeframe, the Opportunity Scorer awards full confluence points (20/20) and triggers a **#SMART_MONEY** high-priority signal.
