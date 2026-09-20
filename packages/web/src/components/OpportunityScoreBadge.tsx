'use client';

import { useState } from 'react';
import { OpportunityScore } from '@memesniper/shared';
import { ScoreBreakdownModal } from './ScoreBreakdownModal';

interface Props {
  score: OpportunityScore;
  tokenSymbol?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OpportunityScoreBadge({ score, tokenSymbol = 'TOKEN', size = 'md' }: Props) {
  const [showModal, setShowModal] = useState(false);
  const total = score.totalScore;

  let colorBg = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400';
  let badgeColor = 'bg-emerald-500';

  if (total < 50) {
    colorBg = 'bg-red-950/60 border-red-500/40 text-red-400';
    badgeColor = 'bg-red-500';
  } else if (total < 75) {
    colorBg = 'bg-amber-950/60 border-amber-500/40 text-amber-400';
    badgeColor = 'bg-amber-500';
  } else if (total >= 90) {
    colorBg = 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]';
    badgeColor = 'bg-cyan-400';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-lg px-3.5 py-1.5 font-bold',
  }[size];

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        title="Click to view full score breakdown"
        className={`inline-flex items-center gap-1.5 rounded border font-mono font-bold transition-all hover:scale-105 active:scale-95 ${colorBg} ${sizeClasses}`}
      >
        <span className={`h-2 w-2 rounded-full ${badgeColor} ${score.isHighPriority ? 'animate-ping' : ''}`} />
        <span>{total}</span>
        <span className="text-[10px] font-normal opacity-70">/100</span>
      </button>

      {showModal && (
        <ScoreBreakdownModal
          score={score}
          tokenSymbol={tokenSymbol}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
