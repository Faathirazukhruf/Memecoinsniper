import { ChainId } from '../types/chain';
import { WalletMetrics, WalletTrade } from '../types/wallet';

/**
 * Reconstructs wallet performance metrics from a collection of trade events.
 * Calculates win rate, ROI multiple, profit factor, early entry rate, and smart score.
 */
export function calculateWalletMetrics(
  walletAddress: string,
  chainId: ChainId,
  trades: WalletTrade[]
): WalletMetrics {
  if (!trades || trades.length === 0) {
    return {
      walletAddress,
      chainId,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgRoiMultiple: 1,
      medianRoiMultiple: 1,
      profitFactor: 0,
      realizedPnlUsd: 0,
      earlyEntryRate: 0,
      avgHoldTimeSeconds: 0,
      avgPositionSizeUsd: 0,
      bestTradeMultiple: 1,
      worstTradeMultiple: 1,
      maxConsecutiveLosses: 0,
      preferredDexs: [],
      smartScore: 0,
      confidenceScore: 0,
      updatedAt: Date.now(),
    };
  }

  const completedTrades = trades.filter((t) => t.roiMultiple !== undefined && t.roiMultiple !== null);
  const totalTrades = trades.length;
  let totalPositionSize = 0;
  let earlyEntries = 0;

  for (const t of trades) {
    totalPositionSize += t.amountUsd || 0;
    if (t.holdDurationSeconds !== undefined && t.holdDurationSeconds > 0 && t.isBuy) {
      earlyEntries++;
    }
  }

  const avgPositionSizeUsd = totalPositionSize / Math.max(1, totalTrades);
  const earlyEntryRate = totalTrades > 0 ? earlyEntries / totalTrades : 0;

  let winningTrades = 0;
  let losingTrades = 0;
  let totalGains = 0;
  let totalLosses = 0;
  let realizedPnlUsd = 0;
  let totalHoldSeconds = 0;
  let holdCount = 0;
  let bestTradeMultiple = 1;
  let worstTradeMultiple = 1;
  let currentLossStreak = 0;
  let maxConsecutiveLosses = 0;
  const multiples: number[] = [];

  for (const trade of completedTrades) {
    const mult = trade.roiMultiple ?? 1;
    const pnl = trade.realizedPnlUsd ?? (trade.amountUsd * (mult - 1));
    multiples.push(mult);

    realizedPnlUsd += pnl;

    if (mult > bestTradeMultiple) bestTradeMultiple = mult;
    if (mult < worstTradeMultiple) worstTradeMultiple = mult;

    if (mult > 1.05) {
      winningTrades++;
      totalGains += Math.max(0, pnl);
      currentLossStreak = 0;
    } else if (mult < 0.95) {
      losingTrades++;
      totalLosses += Math.abs(Math.min(0, pnl));
      currentLossStreak++;
      if (currentLossStreak > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentLossStreak;
      }
    }

    if (trade.holdDurationSeconds) {
      totalHoldSeconds += trade.holdDurationSeconds;
      holdCount++;
    }
  }

  const winRate = completedTrades.length > 0 ? winningTrades / completedTrades.length : 0;
  const avgRoiMultiple =
    multiples.length > 0
      ? multiples.reduce((a, b) => a + b, 0) / multiples.length
      : 1;

  let medianRoiMultiple = 1;
  if (multiples.length > 0) {
    const sorted = [...multiples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianRoiMultiple = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 99 : 0;
  const avgHoldTimeSeconds = holdCount > 0 ? totalHoldSeconds / holdCount : 0;
  const confidenceScore = Math.min(1, completedTrades.length / 20);

  const winRateComponent = Math.min(40, winRate * 40);
  const multipleComponent = Math.min(30, Math.max(0, (avgRoiMultiple - 1) * 10));
  const profitFactorComponent = Math.min(20, Math.max(0, profitFactor * 4));
  const earlyComponent = Math.min(10, earlyEntryRate * 10);

  const rawSmartScore = (winRateComponent + multipleComponent + profitFactorComponent + earlyComponent) * (0.5 + 0.5 * confidenceScore);
  const smartScore = Math.min(100, Math.max(0, Math.round(rawSmartScore)));

  return {
    walletAddress,
    chainId,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Math.round(winRate * 1000) / 1000,
    avgRoiMultiple: Math.round(avgRoiMultiple * 100) / 100,
    medianRoiMultiple: Math.round(medianRoiMultiple * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    realizedPnlUsd: Math.round(realizedPnlUsd * 100) / 100,
    earlyEntryRate: Math.round(earlyEntryRate * 1000) / 1000,
    avgHoldTimeSeconds: Math.round(avgHoldTimeSeconds),
    avgPositionSizeUsd: Math.round(avgPositionSizeUsd),
    bestTradeMultiple: Math.round(bestTradeMultiple * 100) / 100,
    worstTradeMultiple: Math.round(worstTradeMultiple * 100) / 100,
    maxConsecutiveLosses,
    preferredDexs: ['Raydium', 'PancakeSwap', 'Uniswap v3'],
    smartScore,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    updatedAt: Date.now(),
  };
}
