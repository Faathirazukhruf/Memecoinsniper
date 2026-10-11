import { ChainId } from "../types/chain";
import { WalletMetrics, WalletTrade, walletKey } from "../types/wallet";

export function calculateWalletMetrics(
  walletAddress: string,
  chainId: ChainId,
  trades: WalletTrade[],
): WalletMetrics {
  const rows = trades.filter(
    (t) =>
      walletKey(t.chainId, t.walletAddress) ===
      walletKey(chainId, walletAddress),
  );
  const completed = rows
    .filter(
      (t) =>
        Number.isFinite(t.realizedPnlUsd) && Number.isFinite(t.roiMultiple),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  const wins = completed.filter((t) => t.realizedPnlUsd! > 0);
  const losses = completed.filter((t) => t.realizedPnlUsd! < 0);
  const gains = wins.reduce((s, t) => s + t.realizedPnlUsd!, 0);
  const lost = -losses.reduce((s, t) => s + t.realizedPnlUsd!, 0);
  const multiples = completed.map((t) => t.roiMultiple!).sort((a, b) => a - b);
  const mean = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const mid = Math.floor(multiples.length / 2);
  const median = multiples.length
    ? multiples.length % 2
      ? multiples[mid]
      : (multiples[mid - 1] + multiples[mid]) / 2
    : 0;
  const winRate = completed.length ? wins.length / completed.length : 0;
  const confidenceScore = Math.min(1, completed.length / 20);
  const profitFactor = lost > 0 ? gains / lost : null;
  let streak = 0,
    maxStreak = 0;
  for (const trade of completed) {
    streak = trade.realizedPnlUsd! < 0 ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
  }
  // No early-entry bonus without launch timestamps. Score is evidence-weighted, not a win probability.
  const quality =
    50 * winRate +
    Math.min(25, Math.max(0, (mean(multiples) - 1) * 10)) +
    Math.min(25, (profitFactor ?? (gains > 0 ? 5 : 0)) * 5);
  return {
    walletAddress,
    chainId,
    totalTrades: rows.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate,
    avgRoiMultiple: mean(multiples),
    medianRoiMultiple: median,
    profitFactor,
    realizedPnlUsd: gains - lost,
    earlyEntryRate: null,
    avgHoldTimeSeconds: mean(completed.map((t) => t.holdDurationSeconds ?? 0)),
    avgPositionSizeUsd: mean(
      rows.filter((t) => t.isBuy && t.amountUsd > 0).map((t) => t.amountUsd),
    ),
    bestTradeMultiple: multiples.length ? Math.max(...multiples) : 0,
    worstTradeMultiple: multiples.length ? Math.min(...multiples) : 0,
    maxConsecutiveLosses: maxStreak,
    preferredDexs: [],
    smartScore: Math.round(quality * confidenceScore),
    confidenceScore,
    updatedAt: Date.now(),
  };
}
