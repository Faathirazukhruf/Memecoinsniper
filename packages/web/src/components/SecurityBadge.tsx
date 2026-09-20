'use client';

import { SecurityReport, SecurityStatus } from '@memesniper/shared';
import { ShieldCheck, ShieldAlert, ShieldX, HelpCircle } from 'lucide-react';

interface Props {
  report?: SecurityReport;
  status?: SecurityStatus;
  showDetails?: boolean;
}

export function SecurityBadge({ report, status = report?.status || 'UNKNOWN', showDetails = false }: Props) {
  const config = {
    PASS: {
      bg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400',
      icon: ShieldCheck,
      label: 'PASS',
    },
    WARN: {
      bg: 'bg-amber-950/60 border-amber-500/40 text-amber-400',
      icon: ShieldAlert,
      label: 'WARN',
    },
    FAIL: {
      bg: 'bg-red-950/60 border-red-500/40 text-red-400',
      icon: ShieldX,
      label: 'FAIL',
    },
    UNKNOWN: {
      bg: 'bg-gray-800/60 border-gray-700 text-gray-400',
      icon: HelpCircle,
      label: 'UNKNOWN',
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono font-semibold ${config.bg}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{config.label}</span>
        {report && (
          <span className="text-[10px] opacity-75">({report.riskScore}% risk)</span>
        )}
      </div>

      {showDetails && report && report.flags && report.flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {report.flags.map((flag) => (
            <span
              key={flag.code}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                flag.passed
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/40 border-red-800 text-red-300'
              }`}
            >
              {flag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
