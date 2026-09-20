import { ChainId } from './chain';

export type EventType =
  | 'TOKEN_CREATED'
  | 'POOL_CREATED'
  | 'LIQUIDITY_ADDED'
  | 'LIQUIDITY_REMOVED'
  | 'FIRST_SWAP'
  | 'SWAP'
  | 'LARGE_SWAP'
  | 'VOLUME_SPIKE'
  | 'HOLDER_GROWTH'
  | 'WALLET_BUY'
  | 'WALLET_SELL';

export interface BaseNormalizedEvent {
  id: string;
  type: EventType;
  chainId: ChainId;
  tokenAddress: string;
  poolAddress?: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  latencyMetrics?: {
    eventTimestamp: number;
    detectedTimestamp: number;
    processedTimestamp?: number;
  };
}

export interface TokenCreatedEvent extends BaseNormalizedEvent {
  type: 'TOKEN_CREATED';
  symbol: string;
  name: string;
  decimals: number;
  deployerAddress: string;
  totalSupply?: string;
}

export interface PoolCreatedEvent extends BaseNormalizedEvent {
  type: 'POOL_CREATED';
  dex: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  initialLiquidityUsd?: number;
}

export interface LiquidityEvent extends BaseNormalizedEvent {
  type: 'LIQUIDITY_ADDED' | 'LIQUIDITY_REMOVED';
  amountUsd: number;
  providerAddress: string;
  isBurnOrLock?: boolean;
}

export interface SwapEvent extends BaseNormalizedEvent {
  type: 'FIRST_SWAP' | 'SWAP' | 'LARGE_SWAP';
  isBuy: boolean;
  amountUsd: number;
  tokenAmount: string;
  priceUsd: number;
  traderAddress: string;
  isSmartWallet?: boolean;
}

export interface WalletActivityEvent extends BaseNormalizedEvent {
  type: 'WALLET_BUY' | 'WALLET_SELL';
  walletAddress: string;
  walletLabel?: string;
  amountUsd: number;
  priceUsd: number;
  smartScore?: number;
}

export type NormalizedEvent =
  | TokenCreatedEvent
  | PoolCreatedEvent
  | LiquidityEvent
  | SwapEvent
  | WalletActivityEvent;
