'use client';

import { useEffect, useState } from 'react';
import { ChainId, JournalTrade, OpportunityMode } from '@memesniper/shared';
import { fetchJournal, saveJournalTrade } from '@/lib/api';
import { BookOpen, Plus } from 'lucide-react';

export default function JournalPage() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [symbol, setSymbol] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [chainId, setChainId] = useState<ChainId>('solana');
  const [dex] = useState('Raydium');
  const [positionSize, setPositionSize] = useState('200');
  const [entryPrice, setEntryPrice] = useState('0.00045');
  const [exitPrice, setExitPrice] = useState('');
  const [scoreAtEntry, setScoreAtEntry] = useState('92');
  const [mode, setMode] = useState<OpportunityMode>('NEW_LAUNCH');
  const [entryReason, setEntryReason] = useState('High opportunity score + 2 smart wallets bought');
  const [notes, setNotes] = useState('');
  const [lessons] = useState('');

  const loadData = async () => {
    try {
      const data = await fetchJournal();
      setTrades(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sizeUsd = parseFloat(positionSize) || 100;
      const entryP = parseFloat(entryPrice) || 0.0001;
      const exitP = exitPrice ? parseFloat(exitPrice) : undefined;
      const isClosed = !!exitP;
      const mult = exitP ? exitP / entryP : undefined;
      const pnl = mult ? sizeUsd * (mult - 1) : undefined;

      await saveJournalTrade({
        tokenSymbol: symbol.toUpperCase(),
        tokenName: `${symbol.toUpperCase()} Token`,
        tokenAddress,
        chainId,
        dex,
        status: isClosed ? 'CLOSED' : 'OPEN',
        positionSizeUsd: sizeUsd,
        entryPriceUsd: entryP,
        exitPriceUsd: exitP,
        opportunityScoreAtEntry: parseInt(scoreAtEntry, 10) || 85,
        signalType: mode,
        roiMultiple: mult,
        realizedPnlUsd: pnl,
        entryReason,
        notes,
        lessonsLearned: lessons,
        entryTimestamp: Date.now(),
        exitTimestamp: isClosed ? Date.now() : undefined,
      });

      setShowAddModal(false);
      setSymbol('');
      setTokenAddress('');
      setExitPrice('');
      setNotes('');
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const totalRealizedPnl = trades.reduce((acc, t) => acc + (t.realizedPnlUsd || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="rounded-xl border border-surface-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-accent-blue" />
            <span>Operator Trade Journal</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Record every executed manual trade to track real signal performance and evaluate strategy edge.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-surface-elevated border border-surface-border px-3 py-1.5 text-xs font-mono">
            <span className="text-gray-400">Total PnL: </span>
            <span
              className={`font-bold ${
                totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              ${totalRealizedPnl.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-3.5 py-1.5 text-xs font-bold text-white hover:bg-accent-blue/90 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Log Trade</span>
          </button>
        </div>
      </div>

      {/* Trades Journal Table */}
      <div className="rounded-xl border border-surface-border bg-surface overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-surface-border bg-surface-elevated text-gray-400 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Token & Chain</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Entry Score</th>
              <th className="py-3 px-3">Position ($)</th>
              <th className="py-3 px-3">Multiple</th>
              <th className="py-3 px-3">PnL ($)</th>
              <th className="py-3 px-3">Reason / Notes</th>
              <th className="py-3 px-4 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 text-gray-200">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  No trades logged in journal yet. Click "+ Log Trade" to record your first manual execution.
                </td>
              </tr>
            ) : (
              trades.map((t) => (
                <tr key={t.id} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span>${t.tokenSymbol}</span>
                      <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] uppercase font-normal text-gray-300 border border-surface-border">
                        {t.chainId}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        t.status === 'CLOSED'
                          ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400'
                          : 'bg-blue-950/60 border border-blue-800 text-blue-400'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-cyan-300 font-bold">
                    {t.opportunityScoreAtEntry || '—'}/100
                  </td>
                  <td className="py-3.5 px-3 text-white">
                    ${t.positionSizeUsd.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3">
                    {t.roiMultiple ? (
                      <span
                        className={`font-bold ${
                          t.roiMultiple >= 1 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {t.roiMultiple.toFixed(2)}x
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    {t.realizedPnlUsd !== undefined ? (
                      <span
                        className={`font-bold ${
                          t.realizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {t.realizedPnlUsd >= 0 ? '+' : ''}${t.realizedPnlUsd.toFixed(2)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-gray-400 max-w-[200px] truncate">
                    {t.entryReason || t.notes || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-gray-500">
                    {new Date(t.entryTimestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Trade Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-surface-border bg-surface shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Log Manual Execution</h3>
            <form onSubmit={handleSaveTrade} className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Token Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. PEPE"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Chain</label>
                  <select
                    value={chainId}
                    onChange={(e) => setChainId(e.target.value as ChainId)}
                    className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                  >
                    <option value="solana">Solana</option>
                    <option value="bsc">BNB Smart Chain</option>
                    <option value="base">Base</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Contract Address</label>
                <input
                  type="text"
                  placeholder="Token Address..."
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Position Size ($)</label>
                  <input
                    type="number"
                    value={positionSize}
                    onChange={(e) => setPositionSize(e.target.value)}
                    className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Entry Price ($)</label>
                  <input
                    type="text"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Exit Price ($) (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave blank if open"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Opportunity Score at Entry</label>
                  <input
                    type="number"
                    value={scoreAtEntry}
                    onChange={(e) => setScoreAtEntry(e.target.value)}
                    className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Signal Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as OpportunityMode)}
                    className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                  >
                    <option value="NEW_LAUNCH">New Launch</option>
                    <option value="SMART_MONEY">Smart Money</option>
                    <option value="MOMENTUM">Momentum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Entry Rationale</label>
                <input
                  type="text"
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Notes & Lessons</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What worked? What failed? Execution slippage notes..."
                  className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg bg-surface-elevated px-3 py-1.5 text-gray-300 hover:bg-surface-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent-blue px-4 py-1.5 text-white font-bold hover:bg-accent-blue/90 transition-colors"
                >
                  Save Trade Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
