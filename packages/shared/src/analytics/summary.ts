import { JournalTrade } from '../types/journal';

export function summarizeTrades(trades: JournalTrade[]) {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const measured = closed.filter(t => typeof t.realizedPnlUsd === 'number' && Number.isFinite(t.realizedPnlUsd));
  const winners = measured.filter(t => t.realizedPnlUsd! > 0);
  const losers = measured.filter(t => t.realizedPnlUsd! < 0);
  const gains = winners.reduce((sum, t) => sum + t.realizedPnlUsd!, 0);
  const losses = -losers.reduce((sum, t) => sum + t.realizedPnlUsd!, 0);
  const multiples = winners.filter(t => typeof t.roiMultiple === 'number' && Number.isFinite(t.roiMultiple));
  return {
    closedTrades: closed.length,
    measuredTrades: measured.length,
    missingPnlTrades: closed.length - measured.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate: measured.length ? winners.length / measured.length : null,
    totalPnlUsd: measured.length ? gains - losses : null,
    profitFactor: losses > 0 ? gains / losses : null,
    avgWinnerMultiple: multiples.length ? multiples.reduce((sum, t) => sum + t.roiMultiple!, 0) / multiples.length : null,
  };
}
