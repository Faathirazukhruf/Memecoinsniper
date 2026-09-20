'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChainId, SUPPORTED_CHAINS } from '@memesniper/shared';
import { fetchTokenDetail } from '@/lib/api';
import { OpportunityScoreBadge } from '@/components/OpportunityScoreBadge';
import { SecurityBadge } from '@/components/SecurityBadge';
import {
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
  Wallet,
  Copy,
} from 'lucide-react';

export default function TokenDetailPage() {
  const params = useParams();
  const chainId = (params.chain as ChainId) || 'solana';
  const address = (params.address as string) || '';

  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetchTokenDetail(chainId, address);
      setData(res);
    }
    load();
  }, [chainId, address]);

  const chainConfig = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.solana;
  const token = data?.token || data?.signal?.token;
  const security = data?.security || data?.signal?.security;
  const signal = data?.signal;
  const mkt = token?.market;

  const dexUrl = chainConfig.dexSwapUrlTemplate.replace('{address}', address);
  const chartUrl = `https://dexscreener.com/${chainConfig.dexScreenerPrefix}/${address}?embed=1&theme=dark&trades=0&info=0`;

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Back to Screener */}
      <div className="flex items-center justify-between">
        <Link
          href="/scanner"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-mono transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Multi-Chain Screener</span>
        </Link>
      </div>

      {/* Main Token Header Card */}
      <div className="rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                ${token?.symbol || 'TOKEN'}
              </h1>
              <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs font-mono uppercase text-gray-300 border border-surface-border">
                {chainConfig.name}
              </span>
              <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs text-gray-400 border border-surface-border">
                {token?.pool?.dex || chainConfig.defaultDex}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400 font-mono">
                {token?.name || 'Meme Token'} • CA: {address}
              </span>
              <button
                onClick={copyAddress}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copy Contract Address"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copied && <span className="text-[10px] text-emerald-400 font-mono">Copied!</span>}
            </div>
          </div>

          {/* Actions & High Score Badge */}
          <div className="flex items-center gap-3">
            {security && <SecurityBadge report={security} showDetails={false} />}
            {signal?.opportunityScore && (
              <OpportunityScoreBadge
                score={signal.opportunityScore}
                tokenSymbol={token?.symbol || 'TOKEN'}
                size="lg"
              />
            )}
            <a
              href={dexUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-accent-blue px-4 py-2 text-xs font-bold text-white hover:bg-accent-blue/90 shadow-lg shadow-accent-blue/20 transition-all flex items-center gap-1.5"
            >
              <span>Trade on DEX</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Key Metrics Quick Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-surface-border/50 text-xs font-mono">
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">PRICE</span>
            <span className="text-white font-bold text-sm">
              ${mkt?.priceUsd ? mkt.priceUsd.toFixed(8) : '0.00000000'}
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">LIQUIDITY</span>
            <span className="text-white font-bold text-sm">
              ${Math.round(mkt?.liquidityUsd || 0).toLocaleString()}
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">5M VOLUME</span>
            <span className="text-emerald-400 font-bold text-sm">
              ${Math.round(mkt?.volume5mUsd || 0).toLocaleString()}
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">MOMENTUM ACCEL</span>
            <span className="text-cyan-400 font-bold text-sm">
              {mkt?.volumeAcceleration || 1.0}x
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">BUY / SELL RATIO</span>
            <span className="text-white font-bold text-sm">
              {Math.round((mkt?.buySellRatio5m || 0.5) * 100)}% Buys
            </span>
          </div>
          <div className="rounded-lg bg-surface-elevated p-3 border border-surface-border">
            <span className="text-gray-500 block text-[10px]">HOLDERS</span>
            <span className="text-white font-bold text-sm">
              {mkt?.holdersCount || 1}
            </span>
          </div>
        </div>
      </div>

      {/* Chart & Intelligence Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: DexScreener Live Chart */}
        <div className="lg:col-span-2 rounded-xl border border-surface-border bg-surface overflow-hidden shadow-xl flex flex-col min-h-[500px]">
          <div className="border-b border-surface-border px-4 py-3 bg-surface-elevated flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-gray-300">
              Live Chart Embed ({chainConfig.name})
            </span>
            <a
              href={`https://dexscreener.com/${chainConfig.dexScreenerPrefix}/${address}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-accent-blue hover:underline flex items-center gap-1 font-mono"
            >
              <span>DexScreener Full Screen</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex-1 w-full bg-black">
            <iframe
              src={chartUrl}
              title="DexScreener Chart"
              className="w-full h-full min-h-[480px] border-0"
              loading="lazy"
            />
          </div>
        </div>

        {/* Right 1 Col: Security Audit & Score Details */}
        <div className="space-y-6">
          {/* Security Deep Dive */}
          <div className="rounded-xl border border-surface-border bg-surface p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-cyan" />
                <span>Security Engine Audit</span>
              </h3>
              {security && <SecurityBadge report={security} />}
            </div>

            <div className="space-y-2.5 text-xs font-mono divide-y divide-surface-border/40">
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400">Honeypot Check</span>
                <span className={security?.isHoneypot ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {security?.isHoneypot ? 'FAIL (Honeypot)' : 'PASS (Clean)'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400">Buy / Sell Tax</span>
                <span className="text-white">
                  {security?.buyTaxPercentage ?? 0}% / {security?.sellTaxPercentage ?? 0}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400">Mint Authority</span>
                <span className={security?.isMintable ? 'text-red-400' : 'text-emerald-400'}>
                  {security?.isMintable ? 'Active (Supply Dilution Risk)' : 'Revoked (Safe)'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400">Freeze / Blacklist</span>
                <span className={security?.isFreezable ? 'text-red-400' : 'text-emerald-400'}>
                  {security?.isFreezable ? 'Active (Freeze Risk)' : 'Revoked (Safe)'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400">LP Lock / Burn</span>
                <span className={security?.isLpLockedOrBurned ? 'text-emerald-400' : 'text-amber-400'}>
                  {security?.isLpLockedOrBurned ? `${security?.lpLockedPercentage ?? 100}% Locked/Burned` : 'Unlocked'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400">Top 10 Holder Share</span>
                <span className="text-white">
                  {security?.top10HoldersSharePercentage ?? 18}%
                </span>
              </div>
            </div>
          </div>

          {/* Smart Wallet Activity */}
          <div className="rounded-xl border border-surface-border bg-surface p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet className="h-4 w-4 text-accent-blue" />
              <span>Smart Wallet Radar</span>
            </h3>
            <p className="text-xs text-gray-400">
              {signal?.smartWalletsCount || 0} tracked smart wallets bought this token.
            </p>
            {signal?.smartWalletAddresses && signal.smartWalletAddresses.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {signal.smartWalletAddresses.map((w: string) => (
                  <Link
                    key={w}
                    href={`/wallets/${chainId}/${w}`}
                    className="block rounded bg-surface-elevated hover:bg-surface-border border border-surface-border px-2.5 py-1.5 text-xs font-mono text-accent-cyan transition-colors truncate"
                  >
                    {w}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
