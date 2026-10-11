import { describe, it, expect, vi } from "vitest";
import {
  decodeSolana,
  RpcWalletSource,
  USDC,
} from "../packages/engine/src/wallet/source";
import { TrackedWallet } from "../packages/shared/src/types/wallet";
const balance = (mint: string, amount: string) => ({
  mint,
  owner: "wallet",
  uiTokenAmount: { amount, decimals: 6 },
});
function tx(logs: string[]) {
  return {
    blockTime: 123,
    meta: {
      err: null,
      fee: 5000,
      preBalances: [10000],
      postBalances: [5000],
      preTokenBalances: [balance(USDC.solana!, "100000000")],
      postTokenBalances: [balance("Mint", "10000000")],
      logMessages: logs,
    },
    transaction: { message: { accountKeys: ["wallet"] } },
  };
}
describe("RPC ingestion", () => {
  it("decodes actual token deltas and separates transfers from swaps", () => {
    const trade = decodeSolana(
      "wallet",
      "hash",
      tx([
        "Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [1]",
        "Program log: Instruction: Route",
        "Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 success",
      ]),
      1,
    )[0];
    expect(trade).toMatchObject({
      tokenAddress: "Mint",
      quantity: 10,
      usdValue: 100,
      kind: "SWAP",
    });
    expect(decodeSolana("wallet", "hash", tx([]), 1)[0]).toMatchObject({
      kind: "TRANSFER",
      usdValue: null,
    });
  });
  it("ignores failed transactions", () => {
    const data = tx([]);
    data.meta.err = {} as any;
    expect(decodeSolana("wallet", "hash", data, 1)).toEqual([]);
  });
  it("rejects missing transaction rather than advancing checkpoint", async () => {
    const rpc = vi.fn(async (_chain: string, method: string) =>
      method === "getSignaturesForAddress"
        ? [{ signature: "new", slot: 1, err: null }]
        : null,
    );
    await expect(
      new RpcWalletSource(rpc).fetch({
        chainId: "solana",
        address: "wallet",
        sync: {},
      } as TrackedWallet),
    ).rejects.toThrow("unavailable");
  });
  it("detects a gap after an existing cursor", async () => {
    const rpc = vi.fn(async () => [{ signature: "new", slot: 1, err: null }]);
    await expect(
      new RpcWalletSource(rpc).fetch({
        chainId: "solana",
        address: "wallet",
        sync: { cursor: "missing" },
      } as TrackedWallet),
    ).rejects.toThrow("History gap");
  });
  it("rejects a provider configured for the wrong EVM chain", async () => {
    await expect(
      new RpcWalletSource(async () => "0x1").fetch({
        chainId: "base",
        address: "0xabc",
        sync: {},
      } as TrackedWallet),
    ).rejects.toThrow("does not match");
  });
});

import { createRequire } from "node:module";
const { keccak256, toHex } = createRequire(
  new URL("../packages/engine/package.json", import.meta.url),
)("viem");
it("decodes EVM swap settlement and queries only the requested block range", async () => {
  const wallet = "0x1234567890123456789012345678901234567890";
  const padded = "0x" + wallet.slice(2).padStart(64, "0"),
    other = "0x" + "0".repeat(64);
  const transfer = keccak256(toHex("Transfer(address,address,uint256)"));
  const token = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const data = (n: bigint) => "0x" + n.toString(16).padStart(64, "0");
  const calls: any[] = [];
  const rpc = async (_chain: any, method: string, params: any[]) => {
    calls.push([method, params]);
    if (method === "eth_chainId") return "0x2105";
    if (method === "eth_blockNumber") return "0x64";
    if (method === "eth_getLogs") return [{ transactionHash: "hash" }];
    if (method === "eth_getTransactionReceipt")
      return {
        status: "0x1",
        blockNumber: "0x40",
        transactionIndex: "0x2",
        logs: [
          {
            address: USDC.base,
            topics: [transfer, padded, other],
            data: data(100000000n),
          },
          {
            address: token,
            topics: [transfer, other, padded],
            data: data(10000000n),
          },
          {
            address: "pool",
            topics: [
              keccak256(
                toHex("Swap(address,uint256,uint256,uint256,uint256,address)"),
              ),
            ],
          },
        ],
      };
    if (method === "eth_getBlockByNumber") return { timestamp: "0x100" };
    if (method === "eth_call") return "0x6";
    throw new Error("unexpected method");
  };
  const result = await new RpcWalletSource(rpc).fetch({
    chainId: "base",
    address: wallet,
    sync: {},
  } as TrackedWallet);
  expect(result.movements).toHaveLength(1);
  expect(result.movements[0]).toMatchObject({
    kind: "SWAP",
    direction: "IN",
    quantity: 10,
    usdValue: 100,
  });
  expect(result.cursor).toBe("80");
  expect(calls.filter((c) => c[0] === "eth_getLogs")).toHaveLength(2);
});

it("does not trust swap text from an unrelated program", () => {
  expect(
    decodeSolana(
      "wallet",
      "hash",
      tx(["Program log: Instruction: Route"]),
      1,
    )[0].kind,
  ).toBe("TRANSFER");
});
