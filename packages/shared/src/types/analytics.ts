import { ChainId } from './chain';
import { OpportunityMode } from './scoring';

export interface PerformanceMetrics {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  totalPnlUsd: number;
  totalInvestedUsd: number;
  avgWinnerUsd: number;
  avgLoserUsd: number;
  avgRoiMultiple: number;
  medianRoiMultiple: number;
  profitFactor: number;
  maxDrawdownPercentage: number;
  longestWinStreak: number;
  longestLossStreak: number;
  bestTradeMultiple: number;
  bestTradePnlUsd: number;
  worstTradeMultiple: number;
  worstTradePnlUsd: number;
  avgHoldTimeMinutes: number;
}

export interface GroupPerformance {
  groupName: string;
  tradeCount: number;
  winRate: number;
  totalPnlUsd: number;
  avgMultiple: number;
  profitFactor: number;
}

export interface AnalyticsSummary {
  overall: PerformanceMetrics;
  byChain: Record<ChainId, GroupPerformance>;
  bySignalMode: Record<OpportunityMode, GroupPerformance>;
  byScoreRange: Record<string, GroupPerformance>;
  byLiquidityRange: Record<string, GroupPerformance>;
  recentTrades: any[];
}
