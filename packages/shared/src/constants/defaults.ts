import { ChainConfig, ChainId } from '../types/chain';
import { ScoreWeights } from '../types/scoring';

export const SUPPORTED_CHAINS: Record<ChainId, ChainConfig> = {
  solana: {
    id: 'solana',
    name: 'Solana',
    nativeCurrency: {
      name: 'SOL',
      symbol: 'SOL',
      decimals: 9,
    },
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    wsUrl: 'wss://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    dexScreenerPrefix: 'solana',
    defaultDex: 'Raydium',
    dexSwapUrlTemplate: 'https://raydium.io/swap/?inputMint=sol&outputMint={address}',
    enabled: true,
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Smart Chain',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrl: 'https://binance.llamarpc.com',
    wsUrl: 'wss://bsc-rpc.publicnode.com',
    explorerUrl: 'https://bscscan.com',
    dexScreenerPrefix: 'bsc',
    defaultDex: 'PancakeSwap v2',
    dexSwapUrlTemplate: 'https://pancakeswap.finance/swap?outputCurrency={address}',
    enabled: true,
  },
  base: {
    id: 'base',
    name: 'Base',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrl: 'https://mainnet.base.org',
    wsUrl: 'wss://base-rpc.publicnode.com',
    explorerUrl: 'https://basescan.org',
    dexScreenerPrefix: 'base',
    defaultDex: 'Uniswap v3',
    dexSwapUrlTemplate: 'https://app.uniswap.org/swap?chain=base&outputCurrency={address}',
    enabled: true,
  },
};

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  liquidity: 15,
  momentum: 20,
  smartWallet: 20,
  security: 20,
  holderGrowth: 10,
  volumePressure: 10,
  tokenAge: 5,
};

export const DEFAULT_THRESHOLDS = {
  minLiquidityUsd: 2000,
  maxLiquidityUsd: 5000000,
  minOpportunityScore: 70,
  highPriorityScoreThreshold: 85,
  maxTokenAgeMinutes: 1440,
  alertDeduplicationWindowMinutes: 30,
  minSmartScore: 65,
};
