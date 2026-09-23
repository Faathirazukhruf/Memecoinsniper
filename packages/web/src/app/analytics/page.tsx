'use client';
import { useEffect, useState } from 'react';
import { fetchJournal } from '@/lib/api';
import { JournalTrade, summarizeTrades } from '@memesniper/shared';

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [state, setState] = useState('loading');
  useEffect(() => {
    fetchJournal().then(data => { setTrades(data); setState('ready'); }).catch(() => setState('error'));
  }, []);
  const summary = summarizeTrades(trades);
  const percent = (n: number | null) => n === null ? '—' : (n * 100).toFixed(1) + '%';
  const number = (n: number | null) => n === null ? '—' : n.toFixed(2);
  const groups = [
    { title: 'Performance by Blockchain', keys: ['solana', 'bsc', 'base'], field: 'chainId' as const },
    { title: 'Performance by Signal Mode', keys: ['SMART_MONEY', 'NEW_LAUNCH', 'MOMENTUM'], field: 'signalType' as const },
  ];
  return <div className="space-y-6">
    <div className="rounded-xl border border-surface-border bg-surface p-6">
      <h1 className="text-xl font-bold">Signal Performance & Learning Loop</h1>
      <p className="text-sm text-gray-400 mt-2">Results calculated from recorded closed trades. Journal entries are not independently verified execution results.</p>
    </div>
    {state === 'loading' ? <p>Loading journal…</p> : state === 'error' ? <p role="alert">Journal unavailable. Performance cannot be calculated.</p> : <>
      {summary.measuredTrades === 0 && <p>No closed trades with recorded PnL yet.</p>}
      {summary.missingPnlTrades > 0 && <p role="status">{summary.missingPnlTrades} closed trades have missing PnL and are excluded from performance metrics.</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['WIN RATE', percent(summary.winRate)],
          ['RECORDED REALIZED PNL ($)', number(summary.totalPnlUsd)],
          ['AVG WINNER MULTIPLE', summary.avgWinnerMultiple === null ? '—' : number(summary.avgWinnerMultiple) + 'x'],
          ['PROFIT FACTOR', number(summary.profitFactor)],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-surface-border bg-surface p-4">
          <span className="text-xs text-gray-400">{label}</span><div className="text-2xl font-mono mt-2">{value}</div>
        </div>)}
      </div>
      <p className="text-xs text-gray-400">{summary.measuredTrades} measured trades · {summary.winningTrades} wins · {summary.losingTrades} losses. Profit factor is unavailable without recorded losses.</p>
      <div className="grid md:grid-cols-2 gap-6">{groups.map(group => <div key={group.title} className="rounded-xl border border-surface-border bg-surface p-5 space-y-3">
        <h2 className="font-bold">{group.title}</h2>
        {group.keys.map(key => { const stats = summarizeTrades(trades.filter(t => t[group.field] === key)); return <div key={key} className="flex flex-wrap justify-between gap-2 text-xs font-mono p-3 bg-surface-elevated rounded">
          <span>{key}</span><span>{percent(stats.winRate)} wins · $ {number(stats.totalPnlUsd)} PnL · n={stats.measuredTrades}</span>
        </div>; })}
      </div>)}</div>
    </>}
  </div>;
}
