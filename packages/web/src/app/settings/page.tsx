'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SCORE_WEIGHTS } from '@memesniper/shared';
import { fetchHealth } from '@/lib/api';
import { Settings, Bell, Cpu, Save } from 'lucide-react';

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [weights, setWeights] = useState(DEFAULT_SCORE_WEIGHTS);
  const [telegramMinScore, setTelegramMinScore] = useState(80);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchHealth().then(setHealth);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-surface-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-accent-blue" />
            <span>Terminal & Engine Configuration</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Fine-tune opportunity scoring weights, alert triggers, and inspect multi-chain connection health.
          </p>
        </div>

        {saved && (
          <div className="rounded-lg bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 text-xs font-mono text-emerald-400">
            Preview only — changes are not saved to the engine.
          </div>
        )}
      </div>

      {/* Engine Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {health?.chains?.map((c: any) => (
          <div
            key={c.chainId}
            className="rounded-xl border border-surface-border bg-surface p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase font-mono">
                {c.name}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  c.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
            </div>
            <div className="text-xs font-mono text-gray-400">
              Status: <span className="text-emerald-400 font-bold">{c.isConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <div className="text-xs font-mono text-gray-400">
              Events Processed: <span className="text-white font-bold">{c.eventsProcessed}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Scoring Weights Config */}
      <form onSubmit={handleSave} className="rounded-xl border border-surface-border bg-surface p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="h-5 w-5 text-accent-cyan" />
            <span>Opportunity Score Dimension Weights (Total: 100 pts)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Configure transparent point allocations across each evaluation factor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Liquidity & LP Lock Status:</span>
              <span className="text-accent-cyan font-bold">{weights.liquidity} pts</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={weights.liquidity}
              onChange={(e) => setWeights({ ...weights, liquidity: parseInt(e.target.value, 10) })}
              className="w-full accent-accent-cyan"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Momentum & Volume Acceleration:</span>
              <span className="text-accent-cyan font-bold">{weights.momentum} pts</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={weights.momentum}
              onChange={(e) => setWeights({ ...weights, momentum: parseInt(e.target.value, 10) })}
              className="w-full accent-accent-cyan"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Smart Wallet Confluence:</span>
              <span className="text-accent-cyan font-bold">{weights.smartWallet} pts</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={weights.smartWallet}
              onChange={(e) => setWeights({ ...weights, smartWallet: parseInt(e.target.value, 10) })}
              className="w-full accent-accent-cyan"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Security & Risk Evaluation:</span>
              <span className="text-accent-cyan font-bold">{weights.security} pts</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={weights.security}
              onChange={(e) => setWeights({ ...weights, security: parseInt(e.target.value, 10) })}
              className="w-full accent-accent-cyan"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Holder Growth Velocity:</span>
              <span className="text-accent-cyan font-bold">{weights.holderGrowth} pts</span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              value={weights.holderGrowth}
              onChange={(e) => setWeights({ ...weights, holderGrowth: parseInt(e.target.value, 10) })}
              className="w-full accent-accent-cyan"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Buy / Sell Pressure:</span>
              <span className="text-accent-cyan font-bold">{weights.volumePressure} pts</span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              value={weights.volumePressure}
              onChange={(e) => setWeights({ ...weights, volumePressure: parseInt(e.target.value, 10) })}
              className="w-full accent-accent-cyan"
            />
          </div>
        </div>

        {/* Telegram Alerts Config */}
        <div className="pt-6 border-t border-surface-border space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent-blue" />
            <span>Telegram Alert Thresholds</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-gray-400 block mb-1">
                Minimum Score to Trigger Alert: {telegramMinScore}/100
              </label>
              <input
                type="range"
                min="60"
                max="95"
                step="5"
                value={telegramMinScore}
                onChange={(e) => setTelegramMinScore(parseInt(e.target.value, 10))}
                className="w-full accent-accent-blue"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2 text-xs font-bold text-white hover:bg-accent-blue/90 shadow-sm transition-all"
          >
            <Save className="h-4 w-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
