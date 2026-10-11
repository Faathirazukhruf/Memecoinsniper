import path from "node:path";
import { PublicKey } from "@solana/web3.js";
import { isAddress } from "viem";
import {
  calculateWalletMetrics,
  ChainId,
  reconstructWallet,
  TrackedWallet,
  WalletDetail,
  walletKey,
} from "@memesniper/shared";
import { WalletStore, WalletRecord } from "../wallet/store.js";
import { RpcWalletSource, WalletSource } from "../wallet/source.js";
import { config } from "../config/env.js";

export class WalletInputError extends Error {}
export function validateWallet(
  chain: unknown,
  value: unknown,
): { chainId: ChainId; address: string } {
  if (chain !== "solana" && chain !== "bsc" && chain !== "base")
    throw new WalletInputError("Choose Solana, BSC, or Base");
  if (typeof value !== "string")
    throw new WalletInputError("Wallet address is required");
  const address = value.trim();
  if (chain === "solana") {
    try {
      const pubkey = new PublicKey(address);
      if (!PublicKey.isOnCurve(pubkey.toBytes())) throw new Error();
    } catch {
      throw new WalletInputError(
        "Enter a valid Solana wallet address (not a program address)",
      );
    }
  } else if (!isAddress(address) || /^0x0{40}$/i.test(address))
    throw new WalletInputError("Enter a valid EVM wallet address");
  return {
    chainId: chain,
    address: chain === "solana" ? address : address.toLowerCase(),
  };
}
export class WalletRadar {
  private running = new Map<string, Promise<void>>();
  private generation = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  constructor(
    private store = new WalletStore(
      config.demoMode
        ? undefined
        : process.env.WALLET_STORE_PATH ||
            path.resolve(__dirname, "../../../../data/wallet-radar.json"),
    ),
    private source: WalletSource = new RpcWalletSource(),
    private enabled = !config.demoMode,
  ) {}
  start(): void {
    if (!this.enabled || this.timer) return;
    const tick = async () => {
      for (const { wallet } of this.store.list()) {
        if (!this.timer) break;
        if (wallet.isWatchlisted)
          await this.sync(wallet.chainId, wallet.address);
      }
    };
    this.timer = setInterval(() => {
      void tick().catch((err) => console.error("[Wallet Radar]", err.message));
    }, 30000);
    void tick().catch((err) => console.error("[Wallet Radar]", err.message));
  }
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await Promise.allSettled(this.running.values());
  }
  async trackWallet(input: {
    chainId: unknown;
    address: unknown;
    label?: unknown;
    notes?: unknown;
  }): Promise<TrackedWallet> {
    const { chainId, address } = validateWallet(input.chainId, input.address);
    if (
      input.label !== undefined &&
      (typeof input.label !== "string" || input.label.length > 80)
    )
      throw new WalletInputError("Label must be at most 80 characters");
    if (
      input.notes !== undefined &&
      (typeof input.notes !== "string" || input.notes.length > 1000)
    )
      throw new WalletInputError("Notes must be at most 1000 characters");
    if (this.store.get(chainId, address))
      throw new WalletInputError("Wallet already tracked on this chain");
    if (this.store.list().length >= 50)
      throw new WalletInputError("Maximum 50 tracked wallets");
    const wallet: TrackedWallet = {
      chainId,
      address,
      label: typeof input.label === "string" ? input.label.trim() : undefined,
      notes: typeof input.notes === "string" ? input.notes.trim() : undefined,
      category: "UNKNOWN",
      isWatchlisted: true,
      smartScore: 0,
      firstSeenAt: Date.now(),
      lastActiveAt: 0,
      measuredExits: 0,
      sync: {
        status: this.enabled ? "PENDING" : "PAUSED",
        coverage: "Not synchronized yet",
      },
    };
    this.store.save({ wallet, movements: [] });
    return wallet;
  }
  async getTrackedWallets(): Promise<TrackedWallet[]> {
    return this.store.list().map((r) => r.wallet);
  }
  getDetail(chain: ChainId, address: string): WalletDetail | null {
    const record = this.store.get(chain, address);
    if (!record) return null;
    const { trades, positions } = reconstructWallet(
      record.wallet.address,
      chain,
      record.movements,
    );
    return {
      wallet: record.wallet,
      movements: [...record.movements].sort((a, b) => b.order - a.order),
      trades: [...trades].reverse(),
      positions,
      metrics: calculateWalletMetrics(record.wallet.address, chain, trades),
    };
  }
  remove(chain: ChainId, address: string): boolean {
    if (!this.store.get(chain, address)) return false;
    const key = walletKey(chain, address);
    this.generation.set(key, (this.generation.get(key) ?? 0) + 1);
    this.store.remove(chain, address);
    return true;
  }
  setPaused(chain: ChainId, address: string, paused: boolean): boolean {
    const record = this.store.get(chain, address);
    if (!record) return false;
    const key = walletKey(chain, address);
    this.generation.set(key, (this.generation.get(key) ?? 0) + 1);
    record.wallet.isWatchlisted = !paused;
    record.wallet.sync.status = paused ? "PAUSED" : "PENDING";
    this.store.save(record);
    return true;
  }
  isSmartWallet(chain: ChainId, address: string): boolean {
    const wallet = this.store.get(chain, address)?.wallet;
    return (
      !!wallet &&
      wallet.isWatchlisted &&
      wallet.sync.status === "READY" &&
      Date.now() - (wallet.sync.lastSyncedAt ?? 0) < 120000 &&
      wallet.category === "SMART_TRADER" &&
      wallet.measuredExits >= 20 &&
      wallet.smartScore >= 65
    );
  }
  getTokenSmartWallets(
    chain: ChainId,
    token: string,
  ): { count: number; avgScore: number; addresses: string[] } {
    const wallets = this.store
      .list()
      .filter(
        (r) =>
          r.wallet.chainId === chain &&
          this.isSmartWallet(chain, r.wallet.address) &&
          reconstructWallet(
            r.wallet.address,
            chain,
            r.movements,
          ).positions.some(
            (p) =>
              walletKey(chain, p.tokenAddress) === walletKey(chain, token) &&
              p.quantity > 0,
          ),
      );
    return {
      count: wallets.length,
      avgScore: wallets.length
        ? wallets.reduce((s, r) => s + r.wallet.smartScore, 0) / wallets.length
        : 0,
      addresses: wallets.map((r) => r.wallet.address),
    };
  }
  sync(chain: ChainId, address: string): Promise<void> {
    const key = walletKey(chain, address);
    if (this.running.has(key)) return this.running.get(key)!;
    const record = this.store.get(chain, address);
    if (!record || !record.wallet.isWatchlisted || !this.enabled)
      return Promise.resolve();
    if (
      record.wallet.sync.lastSyncedAt &&
      Date.now() - record.wallet.sync.lastSyncedAt < 10000
    )
      return Promise.resolve();
    const generation = this.generation.get(key) ?? 0;
    const work = this.syncRecord(record, generation).finally(() =>
      this.running.delete(key),
    );
    this.running.set(key, work);
    return work;
  }
  private async syncRecord(
    record: WalletRecord,
    generation: number,
  ): Promise<void> {
    const wallet = record.wallet,
      key = walletKey(wallet.chainId, wallet.address);
    const current = () =>
      this.store.get(wallet.chainId, wallet.address) !== null &&
      (this.generation.get(key) ?? 0) === generation;
    wallet.sync = { ...wallet.sync, status: "SYNCING", error: undefined };
    this.store.save(record);
    try {
      const batch = await this.source.fetch(wallet);
      if (!current()) return;
      const movements = new Map(record.movements.map((m) => [m.id, m]));
      for (const movement of batch.movements)
        movements.set(movement.id, movement);
      record.movements = [...movements.values()];
      const { trades } = reconstructWallet(
        wallet.address,
        wallet.chainId,
        record.movements,
      );
      const metrics = calculateWalletMetrics(
        wallet.address,
        wallet.chainId,
        trades,
      );
      wallet.measuredExits = trades.filter((t) =>
        Number.isFinite(t.realizedPnlUsd),
      ).length;
      wallet.smartScore = metrics.smartScore;
      wallet.category =
        wallet.measuredExits >= 20 &&
        wallet.smartScore >= 65 &&
        metrics.realizedPnlUsd > 0
          ? "SMART_TRADER"
          : "UNKNOWN";
      wallet.lastActiveAt = record.movements.reduce(
        (latest, m) => Math.max(latest, m.timestamp),
        0,
      );
      wallet.sync = {
        status: batch.caughtUp === false ? "PENDING" : "READY",
        cursor: batch.cursor,
        lastSyncedAt: Date.now(),
        coverage: batch.coverage,
      };
      this.store.save(record);
    } catch (err) {
      if (!current()) return;
      // Preserve the last committed cursor and movements on failure, so the batch can be retried.
      const previous = this.store.get(wallet.chainId, wallet.address)!;
      previous.wallet.sync = {
        ...previous.wallet.sync,
        status: "ERROR",
        error: (err as Error).message,
      };
      this.store.save(previous);
    }
  }
}
