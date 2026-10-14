# Security & Risk Engine

This document details the deterministic contract and liquidity security checks performed on every token candidate.

---

## 1. Security Statuses & Alert Policy

The Security Engine returns one of four statuses:

| Status | Meaning | Alert Action |
| :--- | :--- | :--- |
| **`PASS`** | All critical security checks verified clean. Token contract is safe for manual operator review. | **Eligible for Telegram Alert** (if Score $\ge 80$). |
| **`WARN`** | Non-critical risk detected (e.g. unrenounced ownership, moderate tax 5–10%, top 10 holders control >40%). | Screener only; **No Telegram Alert**. |
| **`FAIL`** | Critical malicious risk detected (Honeypot, sell tax >25%, active mint/freeze exploit vectors). | Highlighted Red in Screener; **No Telegram Alert**. |
| **`UNKNOWN`** | RPC failed to simulate transaction, contract source is unverified, or LP lock could not be confirmed. | Screener only; **Suppressed from Telegram**. |

> [!IMPORTANT]
> **Zero False Positive Policy:**
> If any critical attribute cannot be verified on-chain, status remains `UNKNOWN`. The engine strictly avoids sending unverified tokens to Telegram alerts to protect capital.

---

## 2. Chain-Specific Security Vectors

### A. Solana (SPL Tokens)
1. **Mint Authority:** Must be `null` / revoked to prevent creator inflating token supply.
2. **Freeze Authority:** Must be `null` / revoked to prevent creator freezing trading token accounts.
3. **LP Token Burn / Lock:** Checks Raydium LP token account to ensure tokens were burned to dead addresses (`1111...` or incinerator).
4. **Deployer Supply:** Deployer holding should be $<5\%$ of total supply.

### B. EVM (BSC & Base)
1. **Honeypot Simulation:** Verifies that a simulated buy and immediate sell succeeds via DEX router simulation.
2. **Buy & Sell Tax:** Decodes router transfer logs:
   - Tax $<5\%$: Safe (`PASS`).
   - Tax $5\%–10\%$: Moderate Warning (`WARN`).
   - Tax $>25\%$: Critical Failure (`FAIL`).
3. **Blacklist Functions:** Scans contract bytecode for trading restrictions or blacklist mappings.
4. **LP Lock Status:** Verifies liquidity pool tokens locked in PinkLock / UNCX / dead burn addresses.

---

## 3. Known Blind Spots & Limitations

Memecoin developers constantly invent new deception tactics. Operators must be aware of:

1. **Raydium CPMM / CLMM Pools (Solana):**
   - Older Raydium v4 pools burn LP tokens to dead mints. Newer Concentrated Liquidity pools (CLMM / CPMM) lock liquidity inside custom escrow accounts. If the engine cannot unambiguously verify the lock escrow, the token remains marked `UNKNOWN`.
2. **Block-Delay / Cooldown Honeypots (EVM):**
   - Some malicious contracts allow buys and sells during the first block, then activate a 99% sell tax starting from block $N+10$.
3. **Dynamic Proxy Contracts:**
   - Contracts with upgradeable proxy admin keys can alter transfer logic post-launch. Ownership must be renounced to mitigate this risk.

---

## 4. Structured Risk Output Schema

Every security scan generates a structured `SecurityReport`:

```typescript
export interface SecurityReport {
  tokenAddress: string;
  chainId: ChainId;
  status: SecurityStatus; // 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN'
  riskScore: number;      // 0 (safest) to 100 (highest risk)
  isHoneypot: boolean | null;
  buyTaxPercentage: number | null;
  sellTaxPercentage: number | null;
  isMintable: boolean | null;
  isFreezable: boolean | null;
  isOwnershipRenounced: boolean | null;
  isLpLockedOrBurned: boolean | null;
  lpLockedPercentage: number | null;
  top10HoldersSharePercentage: number | null;
  flags: SecurityFlag[];
  checkedAt: number;
}
```
