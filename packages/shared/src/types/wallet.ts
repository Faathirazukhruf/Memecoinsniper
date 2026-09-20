import { ChainId } from './chain';

export type WalletCategory =
  | 'SMART_TRADER'
  | 'ORDINARY_TRADER'
  | 'DEPLOYER'
  | 'DEVELOPER'
  | 'LP_PROVIDER'
  | 'EXCHANGE'
  | 'MARKET_MAKER'
  | 'BOT'
  | 'TREASURY'
  | 'UNKNOWN';

export interface WalletProfile {
  address: string;
  chainId: ChainId;
  label?: string;
  category: WalletCategory;
  isWatchlisted: boolean;
  smartScore: number;
  notes?: string;
  firstSeenAt: number;
  lastActiveAt: number;
}

export interface WalletTrade {
  id: string;
  walletAddress: string;
  chainId: ChainId;
  tokenAddress: string;
  tokenSymbol: string;
  isBuy: boolean;
  amountUsd: number;
  tokenAmount: string;
  priceUsd: number;
  txHash: string;
  timestamp: number;
  realizedPnlUsd?: number;
  roiMultiple?: number;
  holdDurationSeconds?: number;
}

export interface WalletMetrics {
  walletAddress: string;
  chainId: ChainId;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgRoiMultiple: number;
  medianRoiMultiple: number;
  profitFactor: number;
  realizedPnlUsd: number;
  earlyEntryRate: number;
  avgHoldTimeSeconds: number;
  avgPositionSizeUsd: number;
  bestTradeMultiple: number;
  worstTradeMultiple: number;
  maxConsecutiveLosses: number;
  preferredDexs: string[];
  smartScore: number;
  confidenceScore: number;
  updatedAt: number;
}
