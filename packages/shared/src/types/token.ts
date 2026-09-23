import { ChainId } from './chain';

export interface TokenMetadata {
  address: string;
  chainId: ChainId;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply?: string;
  deployerAddress?: string;
  createdAt: number;
  description?: string;
  iconUrl?: string;
}

export interface PoolMetadata {
  id: string;
  address: string;
  chainId: ChainId;
  dex: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  quoteTokenSymbol: string;
  initialLiquidityUsd: number;
  currentLiquidityUsd: number;
  reserveBase: string;
  reserveQuote: string;
  createdAt: number;
  lpBurnedOrLocked: boolean | null;
  lpLockedPercentage?: number;
}

export interface TokenMarketMetrics {
  priceUsd: number;
  priceChange1m?: number;
  priceChange5m?: number;
  priceChange1h?: number;
  volume5mUsd: number;
  volume1hUsd: number;
  volume24hUsd: number;
  volumeAcceleration: number;
  liquidityUsd: number;
  marketCapUsd: number;
  txCount5m: number;
  buys5m: number;
  sells5m: number;
  buySellRatio5m: number;
  uniqueBuyers5m: number;
  uniqueSellers5m: number;
  holdersCount: number;
  holderGrowthRate1h: number;
  smartWalletHoldersCount: number;
  updatedAt: number;
}

export interface TokenEntity extends TokenMetadata {
  pool?: PoolMetadata;
  market?: TokenMarketMetrics;
}
