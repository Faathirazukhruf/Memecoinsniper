# Security & Risk Engine

This document details the deterministic contract and liquidity security checks performed on every token candidate.

---

## 1. Security Statuses

The Security Engine returns one of four statuses:

- **`PASS`:** All critical security checks verified clean; token is safe for manual consideration.
- **`WARN`:** Non-critical warning detected (e.g. unrenounced ownership, moderate tax 5–10%, top 10 holders control >40%).
- **`FAIL`:** Critical malicious risk detected (Honeypot, tax >25%, active mint/freeze exploit vectors).
- **`UNKNOWN`:** RPC failed to simulate transaction or contract source is unverified.

---

## 2. Chain-Specific Security Vectors

### A. Solana (SPL Tokens)
1. **Mint Authority:** Must be `null` / revoked to prevent unlimited supply inflation.
2. **Freeze Authority:** Must be `null` / revoked to prevent creator freezing trading accounts.
3. **LP Token Burn:** Checks Raydium LP token account to ensure tokens were transferred to dead addresses (`1111...` or incinerator).
4. **Deployer Supply:** Deployer holding should be $<5\%$ of total supply.

### B. EVM (BSC & Base)
1. **Honeypot Simulation:** Verifies that a simulated buy and immediate sell succeeds.
2. **Buy & Sell Tax:** Decodes router transfer logs; taxes $>10\%$ are flagged `HIGH`, $>25\%$ are flagged `CRITICAL FAIL`.
3. **Blacklist Functions:** Scans contract bytecode for trading restrictions or blacklist mappings.
4. **LP Lock Status:** Verifies liquidity pool tokens locked in PinkLock / UNCX / dead burn addresses.

---

## 3. Structured Risk Output

Every security check generates a `SecurityReport`:

```typescript
export interface SecurityReport {
  tokenAddress: string;
  chainId: ChainId;
  status: SecurityStatus;
  riskScore: number; // 0 (safest) to 100 (highest risk)
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
