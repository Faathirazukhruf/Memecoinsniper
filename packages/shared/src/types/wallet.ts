import { ChainId } from "./chain";

export type WalletCategory =
  | "SMART_TRADER"
  | "ORDINARY_TRADER"
  | "DEPLOYER"
  | "DEVELOPER"
  | "LP_PROVIDER"
  | "EXCHANGE"
  | "MARKET_MAKER"
  | "BOT"
  | "TREASURY"
  | "UNKNOWN";

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
  profitFactor: number | null;
  realizedPnlUsd: number;
  earlyEntryRate: number | null;
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

/** A chain-observed asset movement. USD uses observed USDC settlement at $1 par, excluding gas. */
export interface WalletMovement {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  quantity: number;
  balanceBefore?: number;
  direction: "IN" | "OUT";
  kind: "SWAP" | "TRANSFER";
  usdValue: number | null;
  quoteSymbol?: string;
  quoteAmount?: number;
  txHash: string;
  timestamp: number;
  order: number;
}
export interface WalletPosition {
  tokenAddress: string;
  tokenSymbol: string;
  quantity: number;
  costBasisUsd: number | null;
}
export interface WalletSyncState {
  status: "PENDING" | "SYNCING" | "READY" | "ERROR" | "PAUSED";
  cursor?: string;
  lastSyncedAt?: number;
  error?: string;
  coverage: string;
}
export interface TrackedWallet extends WalletProfile {
  sync: WalletSyncState;
  measuredExits: number;
}
export interface WalletDetail {
  wallet: TrackedWallet;
  movements: WalletMovement[];
  trades: WalletTrade[];
  positions: WalletPosition[];
  metrics: WalletMetrics;
}
export function walletKey(chain: ChainId, address: string): string {
  return chain + ":" + (chain === "solana" ? address : address.toLowerCase());
}
