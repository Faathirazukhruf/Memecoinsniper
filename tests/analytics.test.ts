import { describe, expect, it } from 'vitest';
import { summarizeTrades } from '../packages/shared/src/analytics/summary';
import { JournalTrade } from '../packages/shared/src/types/journal';

describe('Recorded performance', () => {
  it('has no invented performance for an empty journal', () => {
    expect(summarizeTrades([])).toMatchObject({ winRate: null, totalPnlUsd: null, profitFactor: null, avgWinnerMultiple: null });
  });
  it('includes total losses and excludes missing PnL and open positions', () => {
    const rows = [
      { status: 'CLOSED', realizedPnlUsd: 50, roiMultiple: 1.5 },
      { status: 'CLOSED', realizedPnlUsd: -100, roiMultiple: 0 },
      { status: 'CLOSED' },
      { status: 'OPEN', realizedPnlUsd: 999 },
    ] as JournalTrade[];
    expect(summarizeTrades(rows)).toMatchObject({ winRate: 0.5, totalPnlUsd: -50, profitFactor: 0.5, avgWinnerMultiple: 1.5, missingPnlTrades: 1 });
  });
  it('does not invent a finite profit factor with no losses', () => {
    expect(summarizeTrades([{ status: 'CLOSED', realizedPnlUsd: 10 }] as JournalTrade[]).profitFactor).toBeNull();
  });
});
