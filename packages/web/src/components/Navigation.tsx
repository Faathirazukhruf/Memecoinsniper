'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radar,
  Flame,
  Wallet,
  BookOpen,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: Radar },
  { href: '/scanner', label: 'Multi-Chain Screener', icon: Flame },
  { href: '/wallets', label: 'Wallet Radar', icon: Wallet },
  { href: '/journal', label: 'Trade Journal', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-surface/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider text-white">
                MEMECOIN<span className="text-accent-blue">SNIPER</span>
              </span>
              <span className="text-[10px] text-gray-400">Personal Terminal V1</span>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-surface-elevated text-white border border-surface-border shadow-sm'
                    : 'text-gray-400 hover:bg-surface-elevated/50 hover:text-gray-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-accent-blue' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Live Multi-Chain Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 text-[11px] font-mono text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SOL</span>
            <span className="text-gray-500">•</span>
            <span>BSC</span>
            <span className="text-gray-500">•</span>
            <span>BASE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
