'use client';

import { OpportunityScore } from '@memesniper/shared';
import { X, CheckCircle2, ShieldAlert, Sparkles, TrendingUp, Wallet, Clock, Activity } from 'lucide-react';

interface Props {
  score: OpportunityScore;
  tokenSymbol: string;
  onClose: () => void;
}

export function ScoreBreakdownModal({ score, tokenSymbol, onClose }: Props) {
  const bd = score.breakdown;

  const dimensions = [
    {
      title: 'Liquidity & LP Lock',
      score: bd.liquidity.score,
      max: bd.liquidity.max,
      reasoning: bd.liquidity.reasoning,
      icon: Activity,
    },
    {
      title: 'Momentum & Acceleration',
      score: bd.momentum.score,
      max: bd.momentum.max,
      reasoning: bd.momentum.reasoning,
      icon: TrendingUp,
    },
    {
      title: 'Smart Wallet Confluence',
      score: bd.smartWallet.score,
      max: bd.smartWallet.max,
      reasoning: bd.smartWallet.reasoning,
      icon: Wallet,
    },
    {
      title: 'Security & Contract Risk',
      score: bd.security.score,
      max: bd.security.max,
      reasoning: bd.security.reasoning,
      icon: ShieldAlert,
    },
    {
      title: 'Holder Growth Velocity',
      score: bd.holderGrowth.score,
      max: bd.holderGrowth.max,
      reasoning: bd.holderGrowth.reasoning,
      icon: Sparkles,
    },
    {
      title: 'Buy / Sell Pressure',
      score: bd.volumePressure.score,
      max: bd.volumePressure.max,
      reasoning: bd.volumePressure.reasoning,
      icon: CheckCircle2,
    },
    {
      title: 'Token Age & Timing',
      score: bd.tokenAge.score,
      max: bd.tokenAge.max,
      reasoning: bd.tokenAge.reasoning,
      icon: Clock,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-surface-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4 bg-surface-elevated/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/10 border border-accent-blue/30 text-accent-blue font-mono font-bold text-lg">
              {score.totalScore}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                ${tokenSymbol} Opportunity Breakdown
              </h3>
              <p className="text-xs text-gray-400">
                Mode: <span className="text-accent-cyan font-mono">#{score.mode}</span> • Deterministic 0-100 Calc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-surface-elevated hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Breakdown Items */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4 divide-y divide-surface-border/50">
          {dimensions.map((dim, idx) => {
            const Icon = dim.icon;
            const pct = Math.round((dim.score / dim.max) * 100);
            return (
              <div key={dim.title} className={idx > 0 ? 'pt-3' : ''}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
                    <Icon className="h-4 w-4 text-accent-blue" />
                    <span>{dim.title}</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-white">
                    {dim.score} <span className="text-gray-500 font-normal">/ {dim.max} pts</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden mb-1.5 border border-surface-border">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <p className="text-[11px] text-gray-400 italic">
                  {dim.reasoning}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-surface-border px-6 py-3 bg-surface-elevated/30 text-xs text-gray-400 font-mono">
          <span>Formula: Transparent Weighted Math</span>
          <button
            onClick={onClose}
            className="rounded px-3 py-1 bg-surface-border text-white hover:bg-surface-elevated transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
