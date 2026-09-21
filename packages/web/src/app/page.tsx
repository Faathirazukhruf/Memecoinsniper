'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Signal, SUPPORTED_CHAINS } from '@memesniper/shared';
import { fetchSignals, getEventStreamUrl, triggerSimulation } from '@/lib/api';
import { OpportunityScoreBadge } from '@/components/OpportunityScoreBadge';
import { SecurityBadge } from '@/components/SecurityBadge';
import {
  Flame,
  Activity,
  Wallet,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const loadData = async () => {
    try {
      const s = await fetchSignals();
      setSignals(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Setup Live SSE Stream connection
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(getEventStreamUrl());
      eventSource.onopen = () => {
        setIsLiveConnected(true);
      };
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'signal' && payload.data) {
            setSignals((prev) => {
              const exists = prev.some((s) => s.id === payload.data.id || (s.tokenAddress === payload.data.tokenAddress && s.chainId === payload.data.chainId));
              if (exists) {
                return prev.map((s) => (s.tokenAddress === payload.data.tokenAddress && s.chainId === payload.data.chainId ? payload.data : s));
              }
              return [payload.data, ...prev].slice(0, 50);
            });
          }
        } catch {}
      };
      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch {
      setIsLiveConnected(false);
    }

    // 2. Fallback periodic sync
    const interval = setInterval(loadData, 10000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const topOpportunities = signals.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Engine Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-surface-border bg-surface p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-medium">Engine Stream</div>
            <div className="text-lg font-bold text-white font-mono flex items-center gap-2 mt-1">
              <span className={`h-2.5 w-2.5 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isLiveConnected ? 'REAL-TIME SSE' : 'ACTIVE POLLING'}</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-medium">Active Chains</div>
            <div className="text-lg font-bold text-white font-mono mt-1">
              SOL • BSC • BASE
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-950/50 border border-blue-800/40 flex items-center justify-center text-accent-blue">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-medium">High Score Opportunities</div>
            <div className="text-lg font-bold text-accent-cyan font-mono mt-1">
              {signals.filter((s) => s.opportunityScore.totalScore >= 85).length} Active
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
            <Flame className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-medium">Execution Safety</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
              100% MANUAL
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Section: Top Ranked Opportunities & Fast Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Top Ranked Opportunities */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-accent-cyan" />
              <h2 className="text-base font-bold text-white">Top Ranked Opportunities</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadData()}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </button>
              <Link
                href="/scanner"
                className="text-xs text-accent-blue hover:underline flex items-center gap-1 font-medium"
              >
                <span>View Full Screener</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {topOpportunities.map((sig, idx) => {
              const chainConfig = SUPPORTED_CHAINS[sig.chainId];
              const dexUrl = chainConfig.dexSwapUrlTemplate.replace('{address}', sig.tokenAddress);
              const mkt = sig.token.market;

              return (
                <div
                  key={sig.id}
                  className="rounded-xl border border-surface-border bg-surface hover:border-surface-border/80 p-4 transition-all hover:bg-surface-elevated/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Token Info */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-elevated border border-surface-border text-xs font-mono font-bold text-gray-300">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/tokens/${sig.chainId}/${sig.tokenAddress}`}
                            className="text-base font-bold text-white hover:text-accent-blue transition-colors"
                          >
                            ${sig.tokenSymbol}
                          </Link>
                          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-mono uppercase text-gray-300 border border-surface-border">
                            {sig.chainId}
                          </span>
                          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-gray-400 border border-surface-border">
                            {sig.dex}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                          {sig.tokenName} • CA: {sig.tokenAddress.slice(0, 6)}...{sig.tokenAddress.slice(-4)}
                        </div>
                      </div>
                    </div>

                    {/* Score & Actions */}
                    <div className="flex items-center gap-3">
                      <SecurityBadge report={sig.security} />
                      <OpportunityScoreBadge
                        score={sig.opportunityScore}
                        tokenSymbol={sig.tokenSymbol}
                      />
                      <a
                        href={dexUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-accent-blue/10 border border-accent-blue/30 px-3 py-1.5 text-xs font-bold text-accent-blue hover:bg-accent-blue/20 transition-all flex items-center gap-1"
                      >
                        <span>Trade</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-surface-border/50 text-xs font-mono">
                    <div>
                      <span className="text-gray-500">Liquidity: </span>
                      <span className="text-white font-bold">
                        ${Math.round(mkt?.liquidityUsd || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">5m Volume: </span>
                      <span className="text-emerald-400 font-bold">
                        ${Math.round(mkt?.volume5mUsd || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Momentum: </span>
                      <span className="text-cyan-400 font-bold">
                        {mkt?.volumeAcceleration || 1.0}x
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Smart Wallets: </span>
                      <span className="text-amber-400 font-bold">
                        {sig.smartWalletsCount} in
                      </span>
                    </div>
                  </div>

                  {/* Trigger Note */}
                  <div className="mt-2 text-[11px] text-gray-400 italic">
                    ⚡ {sig.triggerReason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Simulation & Wallet Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent-blue" />
              <h2 className="text-base font-bold text-white">Multi-Chain Simulator</h2>
            </div>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface p-4 space-y-3">
            <p className="text-xs text-gray-400">
              Test real-time multi-chain pipeline (Event → Radar → Security → Scoring → UI / Telegram):
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={async () => {
                  await triggerSimulation('solana', 'SOLMEME');
                  await loadData();
                }}
                className="rounded-lg bg-surface-elevated hover:bg-surface-border border border-surface-border p-2 text-center text-xs font-mono text-emerald-400 transition-colors"
              >
                + SOL Pool
              </button>
              <button
                onClick={async () => {
                  await triggerSimulation('bsc', 'BSCDOGE');
                  await loadData();
                }}
                className="rounded-lg bg-surface-elevated hover:bg-surface-border border border-surface-border p-2 text-center text-xs font-mono text-amber-400 transition-colors"
              >
                + BSC Pool
              </button>
              <button
                onClick={async () => {
                  await triggerSimulation('base', 'BASEFROG');
                  await loadData();
                }}
                className="rounded-lg bg-surface-elevated hover:bg-surface-border border border-surface-border p-2 text-center text-xs font-mono text-blue-400 transition-colors"
              >
                + BASE Pool
              </button>
            </div>
          </div>

          {/* Quick Journal CTA */}
          <div className="rounded-xl border border-surface-border bg-gradient-to-br from-surface to-surface-elevated p-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Wallet className="h-4 w-4 text-accent-cyan" />
              <span>Operator Execution Reminder</span>
            </div>
            <p className="text-xs text-gray-400">
              Never rush. Check security score, inspect holder distribution, verify LP lock, and log your manual entry into the Journal to evaluate signal performance.
            </p>
            <Link
              href="/journal"
              className="inline-block w-full text-center rounded-lg bg-surface-border hover:bg-surface-elevated text-xs font-bold text-white py-2 border border-surface-border/80 transition-colors"
            >
              Open Trade Journal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
