import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { WalletRadar } from "../packages/engine/src/radars/wallet-radar";
import { WalletStore } from "../packages/engine/src/wallet/store";
import { createServer } from "../packages/engine/src/server";
const address = "0x1234567890123456789012345678901234567890";
describe("Wallet API lifecycle", () => {
  it("adds, rejects duplicates and invalid input, syncs, pauses, and removes", async () => {
    const source = {
      fetch: vi
        .fn()
        .mockResolvedValue({
          movements: [],
          cursor: "123",
          coverage: "fixture",
        }),
    };
    const radar = new WalletRadar(new WalletStore(), source, true);
    const server = createServer(
      new Map(),
      new EventEmitter() as any,
      radar,
    ).listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const url =
      "http://127.0.0.1:" + (server.address() as any).port + "/api/wallets";
    const req = (suffix: string, method = "GET", body?: unknown) =>
      fetch(url + suffix, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    try {
      expect((await req("", "POST", { chainId: "bad", address })).status).toBe(
        400,
      );
      expect(
        (await req("", "POST", { chainId: "base", address, smartScore: 100 }))
          .status,
      ).toBe(201);
      expect((await req("", "POST", { chainId: "base", address })).status).toBe(
        400,
      );
      const detail = await req("/base/" + address).then((r) => r.json());
      expect(detail.wallet.smartScore).toBe(0);
      expect(detail.wallet.sync.cursor).toBe("123");
      expect(source.fetch).toHaveBeenCalledOnce();
      expect(
        (await req("/base/" + address, "PATCH", { paused: true })).status,
      ).toBe(200);
      expect((await req("/base/" + address + "/sync", "POST")).status).toBe(
        409,
      );
      expect((await req("/base/" + address, "DELETE")).status).toBe(200);
      expect((await req("/base/" + address)).status).toBe(404);
      expect((await req("").then((r) => r.json())).wallets).toEqual([]);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
