# Multi-Chain Architecture & Adding New Chains

This document details the chain adapter interface and provides a guide on how to integrate new blockchains into **Memecoinsniper**.

---

## 1. Supported Initial Chains

| Chain | Network ID | Primary DEXs | Client Library | Key Event Listeners |
| :--- | :--- | :--- | :--- | :--- |
| **Solana** | Mainnet | Raydium AMM / CLMM, Pump.fun | `@solana/web3.js` | `onLogs` program subscriptions |
| **BNB Smart Chain** | 56 | PancakeSwap v2 & v3 | `viem` | Factory `PairCreated`, Swap logs |
| **Base** | 8453 | Uniswap v3, Aerodrome | `viem` | Factory `PoolCreated`, Swap logs |

---

## 2. Chain Adapter Interface

All chain adapters extend `BaseChainAdapter` (`packages/engine/src/chains/base/chain-adapter.ts`):

```typescript
export abstract class BaseChainAdapter extends EventEmitter {
  abstract readonly chainId: ChainId;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract getTokenInfo(address: string): Promise<TokenEntity | null>;
  abstract getPoolInfo(poolAddress: string): Promise<PoolMetadata | null>;
  abstract checkSecurity(tokenAddress: string): Promise<SecurityReport>;
}
```

### Built-in Base Features:
- **Resilient Reconnection:** Exponential backoff with jitter on network/RPC drop.
- **LRU Deduplication:** Cache of recent transaction hashes prevents duplicate event dispatch.
- **Latency Tracking:** Measures delta between block timestamp and event ingestion.

---

## 3. How to Add a New Chain (e.g. Arbitrum, Ethereum, Avalanche)

### Step 1: Update Supported Types
In `packages/shared/src/types/chain.ts`, add the new chain ID to `ChainId`:
```typescript
export type ChainId = 'solana' | 'bsc' | 'base' | 'arbitrum';
```

### Step 2: Add Chain Constants
In `packages/shared/src/constants/defaults.ts`, define the new network details, explorer URL, and DEX swap link template:
```typescript
arbitrum: {
  id: 'arbitrum',
  name: 'Arbitrum One',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  explorerUrl: 'https://arbiscan.io',
  dexScreenerPrefix: 'arbitrum',
  defaultDex: 'Camelot / Uniswap v3',
  dexSwapUrlTemplate: 'https://app.uniswap.org/swap?chain=arbitrum&outputCurrency={address}',
  enabled: true,
}
```

### Step 3: Implement Chain Adapter
Create `packages/engine/src/chains/arbitrum/arbitrum-adapter.ts` implementing `BaseChainAdapter`.

### Step 4: Register in Engine Bootstrapper
In `packages/engine/src/index.ts`, instantiate and register the new adapter in the adapters map.
