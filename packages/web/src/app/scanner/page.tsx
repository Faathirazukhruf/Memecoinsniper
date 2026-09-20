'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Signal, SUPPORTED_CHAINS } from '@memesniper/shared';
import { fetchSignals } from '@/lib/api';
import { OpportunityScoreBadge } from '@/components/OpportunityScoreBadge';
import { SecurityBadge } from '@/components/SecurityBadge';
import {
  Flame,
  ExternalLink,
  Search,
  RefreshCw,
} from 'lucide-react';

export default function ScannerPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(70);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'liquidity' | 'volume' | 'age'>('score');

  const loadData = async () => {
    try {
      const data = await fetchSignals();
      setSignals(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter signals
  const filtered = signals.filter((s) => {
    if (selectedChain !== 'ALL' && s.chainId !== selectedChain) return false;
    if (selectedMode !== 'ALL' && s.mode !== selectedMode) return false;
    if (s.opportunityScore.totalScore < minScore) return false;
    if (
      searchQuery &&
      !s.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.tokenAddress.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Sort signals
  filtered.sort((a, b) => {
    if (sortBy === 'score') {
      return b.opportunityScore.totalScore - a.opportunityScore.totalScore;
    }
    if (sortBy === 'liquidity') {
      return (b.token.market?.liquidityUsd || 0) - (a.token.market?.liquidityUsd || 0);
    }
    if (sortBy === 'volume') {
      return (b.token.market?.volume5mUsd || 0) - (a.token.market?.volume5mUsd || 0);
    }
    if (sortBy === 'age') {
      return b.token.createdAt - a.token.createdAt;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="rounded-xl border border-surface-border bg-surface p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="h-6 w-6 text-accent-cyan" />
              <span>Multi-Chain Memecoin Screener</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Unified ranked screener filtering thousands of raw blockchain events into high-probability opportunities.
            </p>
          </div>
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 rounded-lg bg-surface-elevated hover:bg-surface-border border border-surface-border px-3 py-1.5 text-xs text-gray-300 font-mono transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-surface-border/50">
          {/* Chain Selector */}
          <div>
            <label className="text-[11px] font-mono text-gray-400 uppercase">Chain</label>
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="mt-1 w-full rounded-lg bg-surface-elevated border border-surface-border px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-accent-blue"
            >
              <option value="ALL">All Chains (SOL/BSC/BASE)</option>
              <option value="solana">Solana</option>
              <option value="bsc">BNB Smart Chain</option>
              <option value="base">Base</option>
            </select>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="text-[11px] font-mono text-gray-400 uppercase">Opportunity Mode</label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="mt-1 w-full rounded-lg bg-surface-elevated border border-surface-border px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-accent-blue"
            >
              <option value="ALL">All Modes</option>
              <option value="NEW_LAUNCH">New Launch</option>
              <option value="SMART_MONEY">Smart Money Confluence</option>
              <option value="MOMENTUM">Momentum Surge</option>
            </select>
          </div>

          {/* Min Score Selector */}
          <div>
            <label className="text-[11px] font-mono text-gray-400 uppercase">
              Min Score: {minScore}/100
            </label>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
              className="mt-2 w-full accent-accent-cyan cursor-pointer"
            />
          </div>

          {/* Sort Selector */}
          <div>
            <label className="text-[11px] font-mono text-gray-400 uppercase">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="mt-1 w-full rounded-lg bg-surface-elevated border border-surface-border px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-accent-blue"
            >
              <option value="score">Opportunity Score (Highest)</option>
              <option value="liquidity">Liquidity Depth</option>
              <option value="volume">5m Volume Velocity</option>
              <option value="age">Creation Time (Newest)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-mono text-gray-400 uppercase">Search Token / CA</label>
            <div className="relative mt-1">
              <input
                type="text"
                placeholder="Symbol or Address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-surface-elevated border border-surface-border pl-8 pr-3 py-1.5 text-xs text-white font-mono placeholder:text-gray-500 focus:outline-none focus:border-accent-blue"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Ranked Candidate Screener Table */}
      <div className="rounded-xl border border-surface-border bg-surface overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-surface-border bg-surface-elevated text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Rank & Token</th>
                <th className="py-3 px-3">Chain & DEX</th>
                <th className="py-3 px-3">Age</th>
                <th className="py-3 px-3">Liquidity</th>
                <th className="py-3 px-3">5m Volume</th>
                <th className="py-3 px-3">Momentum</th>
                <th className="py-3 px-3">Smart Wallets</th>
                <th className="py-3 px-3">Security</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-4 text-right">Execution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50 text-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    No memecoin opportunities matched current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((sig, idx) => {
                  const chainConfig = SUPPORTED_CHAINS[sig.chainId];
                  const dexUrl = chainConfig.dexSwapUrlTemplate.replace('{address}', sig.tokenAddress);
                  const mkt = sig.token.market;
                  const ageMins = Math.round(
                    Math.max(0, (Date.now() - sig.token.createdAt) / 60000)
                  );

                  return (
                    <tr
                      key={sig.id}
                      className="hover:bg-surface-elevated/40 transition-colors"
                    >
                      {/* Rank & Token */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-5">#{idx + 1}</span>
                          <Link
                            href={`/tokens/${sig.chainId}/${sig.tokenAddress}`}
                            className="hover:text-accent-blue transition-colors text-sm"
                          >
                            ${sig.tokenSymbol}
                          </Link>
                          <span className="text-[10px] text-gray-400 font-normal truncate max-w-[100px] hidden sm:inline">
                            {sig.tokenName}
                          </span>
                        </div>
                      </td>

                      {/* Chain & DEX */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] uppercase font-bold text-gray-300 border border-surface-border">
                            {sig.chainId}
                          </span>
                          <span className="text-gray-400 text-[11px]">{sig.dex}</span>
                        </div>
                      </td>

                      {/* Age */}
                      <td className="py-3.5 px-3 text-gray-400">
                        {ageMins < 60 ? `${ageMins}m` : `${(ageMins / 60).toFixed(1)}h`}
                      </td>

                      {/* Liquidity */}
                      <td className="py-3.5 px-3 text-white">
                        ${Math.round(mkt?.liquidityUsd || 0).toLocaleString()}
                      </td>

                      {/* 5m Volume */}
                      <td className="py-3.5 px-3 text-emerald-400 font-semibold">
                        ${Math.round(mkt?.volume5mUsd || 0).toLocaleString()}
                      </td>

                      {/* Momentum */}
                      <td className="py-3.5 px-3">
                        <span className="rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 px-1.5 py-0.5 text-[11px]">
                          {mkt?.volumeAcceleration || 1.0}x
                        </span>
                      </td>

                      {/* Smart Wallets */}
                      <td className="py-3.5 px-3">
                        {sig.smartWalletsCount > 0 ? (
                          <span className="rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 px-1.5 py-0.5 text-[11px] font-bold">
                            {sig.smartWalletsCount} Smart
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Security */}
                      <td className="py-3.5 px-3">
                        <SecurityBadge report={sig.security} />
                      </td>

                      {/* Opportunity Score */}
                      <td className="py-3.5 px-3">
                        <OpportunityScoreBadge
                          score={sig.opportunityScore}
                          tokenSymbol={sig.tokenSymbol}
                        />
                      </td>

                      {/* Execution */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/tokens/${sig.chainId}/${sig.tokenAddress}`}
                            className="rounded px-2 py-1 bg-surface-elevated text-gray-300 hover:text-white border border-surface-border text-[11px] transition-colors"
                          >
                            Analyze
                          </Link>
                          <a
                            href={dexUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded px-2.5 py-1 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 border border-accent-blue/30 font-bold text-[11px] transition-all flex items-center gap-1"
                          >
                            <span>DEX</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
