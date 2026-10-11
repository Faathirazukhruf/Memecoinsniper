"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChainId, SUPPORTED_CHAINS, WalletDetail } from "@memesniper/shared";
import { fetchWalletDetail, syncWallet } from "@/lib/api";

export default function WalletDetailPage() {
  const params = useParams(),
    chain = params.chain as ChainId,
    address = params.address as string;
  const [data, setData] = useState<WalletDetail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(100);
  const load = useCallback(async () => {
    try {
      setData(await fetchWalletDetail(chain, address));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [chain, address]);
  useEffect(() => {
    setData(null);
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [load]);
  const money = (value: number | null | undefined) =>
    value == null
      ? "—"
      : value.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        });
  if (!data)
    return (
      <div className="space-y-4">
        <Link href="/wallets">← Wallet Radar</Link>
        <p role={error ? "alert" : "status"}>{error || "Loading wallet…"}</p>
        {error && <button onClick={() => void load()}>Retry</button>}
      </div>
    );
  const { wallet, metrics, positions, movements, trades } = data;
  const pnl = new Map(trades.map((t) => [t.id, t.realizedPnlUsd]));
  const explorer = SUPPORTED_CHAINS[chain].explorerUrl;
  return (
    <div className="space-y-6">
      <Link className="text-accent-blue text-sm" href="/wallets">
        ← Wallet Radar
      </Link>
      <header className="rounded-xl bg-surface border border-surface-border p-6 space-y-3">
        <div className="flex flex-wrap justify-between gap-3">
          <h1 className="text-xl font-bold">
            {wallet.label || "Tracked wallet"} · {chain.toUpperCase()}
          </h1>
          <button
            disabled={
              busy || !wallet.isWatchlisted || wallet.sync.status === "SYNCING"
            }
            className="bg-accent-blue rounded px-4 py-2 disabled:opacity-40"
            onClick={async () => {
              setBusy(true);
              try {
                await syncWallet(chain, address);
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Sync now
          </button>
        </div>
        <a
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs break-all text-accent-blue"
          href={explorer + "/address/" + address}
        >
          {address} ↗
        </a>
        <p className="text-sm">
          {wallet.sync.status} · Last successful sync:{" "}
          {wallet.sync.lastSyncedAt
            ? new Date(wallet.sync.lastSyncedAt).toLocaleString()
            : "never"}
        </p>
        <p className="text-xs text-gray-400">{wallet.sync.coverage}</p>
        {(error || wallet.sync.error) && (
          <p role="alert" className="text-red-300">
            {error || wallet.sync.error}
          </p>
        )}
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          [
            "SMART SCORE",
            wallet.measuredExits ? metrics.smartScore + "/100" : "Unrated",
          ],
          ["MEASURED EXITS", String(wallet.measuredExits)],
          [
            "GROSS REALIZED PNL",
            wallet.measuredExits ? money(metrics.realizedPnlUsd) : "—",
          ],
          [
            "WIN RATE",
            wallet.measuredExits
              ? (metrics.winRate * 100).toFixed(1) + "%"
              : "—",
          ],
          ["PROFIT FACTOR", metrics.profitFactor?.toFixed(2) ?? "—"],
          ["OBSERVED SWAPS", String(metrics.totalTrades)],
          [
            "EVIDENCE CONFIDENCE",
            (metrics.confidenceScore * 100).toFixed(0) + "%",
          ],
          [
            "UNPRICED MOVEMENTS",
            String(movements.filter((m) => m.usdValue === null).length),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-surface border border-surface-border p-4"
          >
            <span className="text-xs text-gray-400">{label}</span>
            <div className="text-xl font-mono mt-2">{value}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        PnL uses FIFO for observed USDC-settled swaps at $1 per USDC and
        excludes gas. Transfers, missing entry history, and unpriced swaps do
        not count as measured exits. Confidence reflects sample size, not
        probability of profit. Twenty measured exits are required for
        smart-wallet confluence.
      </p>
      <section className="rounded-xl bg-surface border border-surface-border p-5">
        <h2 className="font-bold mb-3">
          Positions reconstructed from observed history
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          These are not a full wallet balance snapshot. Holdings acquired before
          the coverage window are absent.
        </p>
        {positions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr>
                  <th className="p-2">Token address</th>
                  <th className="p-2">Observed quantity</th>
                  <th className="p-2">Known cost basis</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr
                    key={p.tokenAddress}
                    className="border-t border-surface-border"
                  >
                    <td className="p-2 font-mono break-all">
                      {p.tokenAddress}
                    </td>
                    <td className="p-2">
                      {p.quantity.toLocaleString(undefined, {
                        maximumSignificantDigits: 8,
                      })}
                    </td>
                    <td className="p-2">{money(p.costBasisUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No remaining positions in observed history.
          </p>
        )}
      </section>
      <section className="rounded-xl bg-surface border border-surface-border p-5">
        <h2 className="font-bold mb-3">
          On-chain activity ({movements.length})
        </h2>
        {!movements.length ? (
          <p className="text-sm text-gray-400">
            No supported token movements found yet. Check sync status and
            coverage above.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    {[
                      "Time",
                      "Type",
                      "Token",
                      "Quantity",
                      "USD settlement",
                      "Realized PnL",
                      "Transaction",
                    ].map((h) => (
                      <th key={h} className="p-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, limit).map((m) => (
                    <tr key={m.id} className="border-t border-surface-border">
                      <td className="p-2 whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleString()}
                      </td>
                      <td className="p-2">
                        {m.kind === "SWAP"
                          ? m.direction === "IN"
                            ? "BUY"
                            : "SELL"
                          : "TRANSFER " + m.direction}
                      </td>
                      <td className="p-2 font-mono" title={m.tokenAddress}>
                        {m.tokenSymbol}
                      </td>
                      <td className="p-2">
                        {m.quantity.toLocaleString(undefined, {
                          maximumSignificantDigits: 8,
                        })}
                      </td>
                      <td className="p-2">{money(m.usdValue)}</td>
                      <td className="p-2">{money(pnl.get(m.id))}</td>
                      <td className="p-2">
                        <a
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent-blue"
                          href={explorer + "/tx/" + m.txHash}
                        >
                          View ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {limit < movements.length && (
              <button
                className="mt-4 text-accent-blue"
                onClick={() => setLimit(limit + 100)}
              >
                Load 100 more
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
