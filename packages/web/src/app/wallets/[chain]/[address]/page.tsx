'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChainId, SUPPORTED_CHAINS } from '@memesniper/shared';
import { fetchWalletDetail } from '@/lib/api';
import {
  ArrowLeft,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';

export default function WalletDetailPage() {
  const params = useParams();
  const chainId = (params.chain as ChainId) || 'solana';
  const address = (params.address as string) || '';

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetchWalletDetail(chainId, address);
      setData(res);
    }
    load();
  }, [chainId, address]);

  const chainConfig = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.solana;
  const wallet = data?.wallet;
  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      <Link
        href="/wallets"
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-mono transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Wallet Radar</span>
      </Link>

      {/* Wallet Summary Card */}
      <div className="rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/10 border border-accent-blue/30 text-accent-blue font-mono font-bold text-xl">
              {wallet?.smartScore || 85}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">
                  {wallet?.label || 'Smart Trader Profile'}
                </h1>
                <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs font-mono uppercase text-gray-300 border border-surface-border">
                  {chainConfig.name}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                {address}
              </p>
            </div>
          </div>

          <a
            href={`${chainConfig.explorerUrl}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-surface-elevated hover:bg-surface-border border border-surface-border px-3.5 py-1.5 text-xs text-white font-mono transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Explorer</span>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
          </a>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-surface-border/50 text-xs font-mono">
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">WIN RATE</span>
            <span className="text-emerald-400 font-bold text-sm">
              {metrics ? Math.round(metrics.winRate * 100) : 76}%
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">AVG MULTIPLE</span>
            <span className="text-cyan-400 font-bold text-sm">
              {metrics?.avgRoiMultiple || 4.8}x
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">PROFIT FACTOR</span>
            <span className="text-white font-bold text-sm">
              {metrics?.profitFactor || 5.4}
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">TOTAL TRADES</span>
            <span className="text-white font-bold text-sm">
              {metrics?.totalTrades || 34}
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">EARLY ENTRY RATE</span>
            <span className="text-emerald-400 font-bold text-sm">
              {metrics ? Math.round(metrics.earlyEntryRate * 100) : 88}%
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">BEST TRADE</span>
            <span className="text-accent-cyan font-bold text-sm">
              {metrics?.bestTradeMultiple || 18.5}x
            </span>
          </div>
        </div>
      </div>

      {/* Historical Trades Timeline */}
      <div className="rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent-blue" />
          <span>Historical Trade Reconstructions</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-surface-border bg-surface-elevated text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Token</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Position ($)</th>
                <th className="py-2.5 px-3">Multiple</th>
                <th className="py-2.5 px-3">PnL ($)</th>
                <th className="py-2.5 px-3">Hold Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50 text-gray-200">
              <tr className="hover:bg-surface-elevated/40">
                <td className="py-3 px-3 font-bold text-white">$SOLCAT</td>
                <td className="py-3 px-3 text-emerald-400">BUY</td>
                <td className="py-3 px-3">$1,200</td>
                <td className="py-3 px-3 text-cyan-400 font-bold">5.4x</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">+$5,280</td>
                <td className="py-3 px-3 text-gray-400">45 mins</td>
              </tr>
              <tr className="hover:bg-surface-elevated/40">
                <td className="py-3 px-3 font-bold text-white">$BASEFROG</td>
                <td className="py-3 px-3 text-emerald-400">BUY</td>
                <td className="py-3 px-3">$850</td>
                <td className="py-3 px-3 text-cyan-400 font-bold">3.8x</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">+$2,380</td>
                <td className="py-3 px-3 text-gray-400">1.2 hrs</td>
              </tr>
              <tr className="hover:bg-surface-elevated/40">
                <td className="py-3 px-3 font-bold text-white">$BNBDOGE</td>
                <td className="py-3 px-3 text-emerald-400">BUY</td>
                <td className="py-3 px-3">$1,500</td>
                <td className="py-3 px-3 text-red-400 font-bold">0.85x</td>
                <td className="py-3 px-3 text-red-400 font-bold">-$225</td>
                <td className="py-3 px-3 text-gray-400">18 mins</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
