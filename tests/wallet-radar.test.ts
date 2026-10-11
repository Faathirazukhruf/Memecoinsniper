import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { WalletStore } from "../packages/engine/src/wallet/store";
import {
  WalletRadar,
  validateWallet,
} from "../packages/engine/src/radars/wallet-radar";
const address = "0x1234567890123456789012345678901234567890";
describe("Durable wallet radar", () => {
  it("validates addresses and chain ids", () => {
    expect(() => validateWallet("solana", "not-a-key")).toThrow();
    expect(() => validateWallet("evil", address)).toThrow();
    expect(() => validateWallet("base", "0x0")).toThrow();
    expect(validateWallet("base", address).address).toBe(address);
  });
  it("persists across restarts and isolates chain namespaces", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "radar-test-"));
    try {
      const file = path.join(dir, "wallets.json");
      const radar = new WalletRadar(
        new WalletStore(file),
        { fetch: vi.fn() },
        false,
      );
      await radar.trackWallet({ chainId: "base", address, label: "Mine" });
      await radar.trackWallet({ chainId: "bsc", address });
      await expect(
        radar.trackWallet({ chainId: "base", address }),
      ).rejects.toThrow("already");
      const restarted = new WalletRadar(
        new WalletStore(file),
        { fetch: vi.fn() },
        false,
      );
      expect(await restarted.getTrackedWallets()).toHaveLength(2);
      expect(restarted.getDetail("base", address)?.wallet.label).toBe("Mine");
      expect(restarted.getDetail("base", address)?.wallet.smartScore).toBe(0);
      restarted.remove("base", address);
      expect(new WalletStore(file).list()).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("keeps checkpoint on failure and records actionable error", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ movements: [], cursor: "10", coverage: "test" })
      .mockRejectedValue(new Error("RPC HTTP 429"));
    const store = new WalletStore();
    const radar = new WalletRadar(store, { fetch }, true);
    await radar.trackWallet({ chainId: "base", address });
    await radar.sync("base", address);
    const record = store.get("base", address)!;
    record.wallet.sync.lastSyncedAt = 0;
    store.save(record);
    await radar.sync("base", address);
    expect(radar.getDetail("base", address)?.wallet.sync).toMatchObject({
      status: "ERROR",
      cursor: "10",
      error: "RPC HTTP 429",
    });
  });
  it("coalesces syncs and cannot resurrect a removed wallet", async () => {
    let finish!: (v: any) => void;
    const fetch = vi.fn(
      () =>
        new Promise<any>((resolve) => {
          finish = resolve;
        }),
    );
    const radar = new WalletRadar(new WalletStore(), { fetch }, true);
    await radar.trackWallet({ chainId: "base", address });
    const first = radar.sync("base", address);
    const second = radar.sync("base", address);
    expect(fetch).toHaveBeenCalledOnce();
    radar.remove("base", address);
    finish({ movements: [], cursor: "10", coverage: "test" });
    await Promise.all([first, second]);
    expect(radar.getDetail("base", address)).toBeNull();
  });
});

it("uses measured performance and remaining positions for smart confluence", async () => {
  const movements: any[] = [];
  for (let i = 0; i < 20; i++) {
    movements.push({
      id: String(i * 2),
      tokenAddress: "Token",
      tokenSymbol: "T",
      quantity: 10,
      direction: "IN",
      kind: "SWAP",
      usdValue: 10,
      txHash: "buy" + i,
      timestamp: i * 2000,
      order: i * 2,
    });
    movements.push({
      id: String(i * 2 + 1),
      tokenAddress: "Token",
      tokenSymbol: "T",
      quantity: 10,
      direction: "OUT",
      kind: "SWAP",
      usdValue: 20,
      txHash: "sell" + i,
      timestamp: i * 2000 + 1000,
      order: i * 2 + 1,
    });
  }
  movements.push({ ...movements[0], id: "40", order: 40 });
  const radar = new WalletRadar(
    new WalletStore(),
    { fetch: async () => ({ movements, cursor: "done", coverage: "test" }) },
    true,
  );
  await radar.trackWallet({ chainId: "base", address });
  await radar.sync("base", address);
  expect(radar.isSmartWallet("base", address)).toBe(true);
  expect(radar.getTokenSmartWallets("base", "token").count).toBe(1);
  radar.setPaused("base", address, true);
  expect(radar.getTokenSmartWallets("base", "token").count).toBe(0);
});
