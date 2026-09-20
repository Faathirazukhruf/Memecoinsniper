'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChainId, WalletProfile } from '@memesniper/shared';
import { addTrackedWallet, fetchWallets } from '@/lib/api';
import {
  Wallet,
  Plus,
  Search,
  UserCheck,
} from 'lucide-react';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newChain, setNewChain] = useState<ChainId>('solana');
  const [newLabel, setNewLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const data = await fetchWallets();
      setWallets(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress) return;
    try {
      await addTrackedWallet({
        address: newAddress,
        chainId: newChain,
        label: newLabel || 'Tracked Alpha Wallet',
        category: 'SMART_TRADER',
        isWatchlisted: true,
        smartScore: 80,
      });
      setShowAddModal(false);
      setNewAddress('');
      setNewLabel('');
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filtered = wallets.filter(
    (w) =>
      w.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.label && w.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="rounded-xl border border-surface-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-accent-blue" />
            <span>Smart Wallet Radar</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Track verified profitable wallets across Solana, BSC, and Base to catch smart-money accumulation early.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search wallet / label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg bg-surface-elevated border border-surface-border pl-8 pr-3 py-1.5 text-xs text-white font-mono placeholder:text-gray-500 focus:outline-none focus:border-accent-blue"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-3.5 py-1.5 text-xs font-bold text-white hover:bg-accent-blue/90 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Wallet</span>
          </button>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="rounded-xl border border-surface-border bg-surface overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-surface-border bg-surface-elevated text-gray-400 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Wallet & Label</th>
              <th className="py-3 px-3">Chain</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Smart Score</th>
              <th className="py-3 px-3">Notes</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 text-gray-200">
            {filtered.map((w) => (
              <tr key={`${w.chainId}-${w.address}`} className="hover:bg-surface-elevated/40 transition-colors">
                <td className="py-3.5 px-4 font-bold text-white">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-accent-blue" />
                    <div>
                      <Link
                        href={`/wallets/${w.chainId}/${w.address}`}
                        className="hover:text-accent-blue transition-colors text-sm"
                      >
                        {w.label || 'Smart Trader'}
                      </Link>
                      <div className="text-[10px] text-gray-400 font-normal">
                        {w.address.slice(0, 8)}...{w.address.slice(-6)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3">
                  <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] uppercase font-bold text-gray-300 border border-surface-border">
                    {w.chainId}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-gray-400">{w.category}</td>
                <td className="py-3.5 px-3">
                  <span className="rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 px-2 py-0.5 text-xs font-bold">
                    {w.smartScore}/100
                  </span>
                </td>
                <td className="py-3.5 px-3 text-gray-400 max-w-[200px] truncate">
                  {w.notes || '—'}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Link
                    href={`/wallets/${w.chainId}/${w.address}`}
                    className="rounded px-2.5 py-1 bg-surface-elevated hover:bg-surface-border text-white border border-surface-border text-[11px] transition-colors"
                  >
                    View Analytics
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Track New Smart Wallet</h3>
            <form onSubmit={handleAddWallet} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Chain</label>
                <select
                  value={newChain}
                  onChange={(e) => setNewChain(e.target.value as ChainId)}
                  className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                >
                  <option value="solana">Solana</option>
                  <option value="bsc">BNB Smart Chain</option>
                  <option value="base">Base</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Wallet Address</label>
                <input
                  type="text"
                  placeholder="Address..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full rounded-lg bg-surface-elevated border border-surface-border p-2 text-white focus:outline-none focus:border-accent-blue"
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Label</label>
                <input
                  type="text"
                  placeholder="e.g. SOL 10x Whale"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
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
                  Save & Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
