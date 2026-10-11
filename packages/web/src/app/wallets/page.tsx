"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChainId, TrackedWallet } from "@memesniper/shared";
import {
  addTrackedWallet,
  deleteWallet,
  fetchWallets,
  pauseWallet,
  syncWallet,
} from "@/lib/api";

export default function WalletsPage() {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [actionError, setActionError] = useState("");
  const [showAdd, setShowAdd] = useState(false),
    [busy, setBusy] = useState("");
  const [address, setAddress] = useState(""),
    [chain, setChain] = useState<ChainId>("solana"),
    [label, setLabel] = useState(""),
    [search, setSearch] = useState("");
  const load = useCallback(async () => {
    try {
      setWallets(await fetchWallets());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [load]);
  const act = async (key: string, operation: () => Promise<unknown>) => {
    setBusy(key);
    setActionError("");
    try {
      await operation();
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await act("add", async () => {
      await addTrackedWallet({ address, chainId: chain, label });
      setShowAdd(false);
      setAddress("");
      setLabel("");
    });
  };
  const filtered = wallets.filter((w) =>
    (w.address + " " + (w.label ?? ""))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const button =
    "rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs disabled:opacity-40 hover:bg-surface-border";
  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-surface-border bg-surface p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Wallet Radar</h1>
          <p className="text-sm text-gray-400 mt-2">
            Follow wallets you choose. Scores use observed, priced exits; adding
            a wallet does not verify profitability.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Search wallets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wallet / label"
            className="rounded-lg bg-surface-elevated border border-surface-border p-2 text-sm"
          />
          <button className={button} onClick={() => void load()}>
            Refresh
          </button>
          <button
            className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-bold"
            onClick={() => {
              setActionError("");
              setShowAdd(true);
            }}
          >
            + Add Wallet
          </button>
        </div>
      </header>
      <p className="text-xs text-gray-400">
        Saved on this engine. Automatic sync every 30 seconds; initial history
        is limited. USD estimates use USDC settlement at $1 and exclude gas.
        Unknown prices and cost basis are excluded from PnL.
      </p>
      {(error || actionError) && (
        <div
          role="alert"
          className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-300"
        >
          {error || actionError}{" "}
          <button className={button} onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Loading wallets…</p>
      ) : wallets.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-surface-border p-12 text-center">
          <h2 className="font-bold">No wallets tracked yet</h2>
          <p className="text-gray-400 mt-2">
            Add a public wallet address to start importing its recent activity.
          </p>
          <button className={button + " mt-4"} onClick={() => setShowAdd(true)}>
            Add your first wallet
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-elevated text-gray-400">
              <tr>
                {[
                  "Wallet",
                  "Chain",
                  "Sync",
                  "Smart score",
                  "Measured exits",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="p-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr
                  key={w.chainId + w.address}
                  className="border-t border-surface-border"
                >
                  <td className="p-4">
                    <Link
                      className="text-accent-blue font-bold"
                      href={"/wallets/" + w.chainId + "/" + w.address}
                    >
                      {w.label || w.address.slice(0, 10) + "…"}
                    </Link>
                    <div className="font-mono text-gray-500 mt-1">
                      {w.address.slice(0, 8)}…{w.address.slice(-6)}
                    </div>
                  </td>
                  <td className="p-4 uppercase">{w.chainId}</td>
                  <td className="p-4">
                    <span
                      className={
                        w.sync.status === "ERROR"
                          ? "text-red-300"
                          : "text-gray-300"
                      }
                    >
                      {w.sync.status}
                    </span>
                    <div className="text-gray-500 mt-1">
                      {w.sync.lastSyncedAt
                        ? new Date(w.sync.lastSyncedAt).toLocaleTimeString()
                        : "Never synced"}
                    </div>
                    {w.sync.error && (
                      <p className="text-red-300 mt-1 max-w-xs">
                        {w.sync.error}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    {w.measuredExits ? w.smartScore + "/100" : "Unrated"}
                    {w.measuredExits > 0 && w.measuredExits < 20 && (
                      <div className="text-gray-500">Limited sample</div>
                    )}
                  </td>
                  <td className="p-4">{w.measuredExits}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        disabled={
                          !!busy ||
                          !w.isWatchlisted ||
                          w.sync.status === "SYNCING"
                        }
                        className={button}
                        onClick={() =>
                          void act(w.address, () =>
                            syncWallet(w.chainId, w.address),
                          )
                        }
                      >
                        Sync
                      </button>
                      <button
                        disabled={!!busy}
                        className={button}
                        onClick={() =>
                          void act(w.address, () =>
                            pauseWallet(w.chainId, w.address, w.isWatchlisted),
                          )
                        }
                      >
                        {w.isWatchlisted ? "Pause" : "Resume"}
                      </button>
                      <button
                        disabled={!!busy}
                        className={button}
                        onClick={() => {
                          if (
                            confirm(
                              "Remove this wallet and its locally stored activity?",
                            )
                          )
                            void act(w.address, () =>
                              deleteWallet(w.chainId, w.address),
                            );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && wallets.length > 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No wallets match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-label="Add wallet"
            onSubmit={save}
            className="w-full max-w-md rounded-xl border border-surface-border bg-surface p-6 space-y-4"
          >
            <h2 className="text-lg font-bold">Track a wallet</h2>
            <label className="block text-sm">
              Chain
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value as ChainId)}
                className="block w-full bg-surface-elevated p-2 mt-1 rounded"
              >
                <option value="solana">Solana</option>
                <option value="bsc">BSC</option>
                <option value="base">Base</option>
              </select>
            </label>
            <label className="block text-sm">
              Public wallet address
              <input
                autoFocus
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="block w-full bg-surface-elevated p-2 mt-1 rounded"
                placeholder="Public address only"
              />
            </label>
            <label className="block text-sm">
              Label (optional)
              <input
                maxLength={80}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="block w-full bg-surface-elevated p-2 mt-1 rounded"
              />
            </label>
            <p className="text-xs text-gray-400">
              No private key required. The first sync can take several minutes
              on public RPC endpoints.
            </p>
            {actionError && (
              <p role="alert" className="text-red-300 text-sm">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy === "add"}
                className={button}
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button
                disabled={busy === "add"}
                className="rounded-lg bg-accent-blue px-4 py-2 disabled:opacity-40"
              >
                {busy === "add" ? "Saving…" : "Save & Track"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
