import { describe, it, expect } from "vitest";
import { reconstructWallet } from "../packages/shared/src/wallet/ledger";
import { WalletMovement } from "../packages/shared/src/types/wallet";
const move = (
  id: string,
  direction: "IN" | "OUT",
  quantity: number,
  usdValue: number | null,
  kind: "SWAP" | "TRANSFER" = "SWAP",
): WalletMovement => ({
  id,
  tokenAddress: "MintCaseSensitive",
  tokenSymbol: "T",
  direction,
  quantity,
  usdValue,
  kind,
  order: Number(id),
  timestamp: Number(id) * 1000,
  txHash: id,
});
describe("Observed FIFO accounting", () => {
  it("accounts for partial sales and remaining basis", () => {
    const result = reconstructWallet("wallet", "solana", [
      move("1", "IN", 100, 100),
      move("2", "OUT", 40, 80),
      move("3", "OUT", 20, 10),
    ]);
    expect(result.trades[1].realizedPnlUsd).toBe(40);
    expect(result.trades[2].realizedPnlUsd).toBe(-10);
    expect(result.positions[0]).toMatchObject({
      quantity: 40,
      costBasisUsd: 40,
    });
  });
  it("does not invent profit for an airdrop or missing acquisition", () => {
    const result = reconstructWallet("wallet", "solana", [
      move("1", "IN", 100, null, "TRANSFER"),
      move("2", "OUT", 100, 100),
      move("3", "OUT", 10, 50),
    ]);
    expect(result.trades.every((t) => t.realizedPnlUsd === undefined)).toBe(
      true,
    );
  });
  it("does not count duplicate transactions twice", () => {
    const row = move("1", "IN", 10, 20);
    expect(
      reconstructWallet("wallet", "solana", [row, row]).positions[0].quantity,
    ).toBe(10);
  });
  it("handles transfer-out, zero proceeds, and unknown quotes", () => {
    const result = reconstructWallet("wallet", "solana", [
      move("1", "IN", 10, 100),
      move("2", "OUT", 5, null, "TRANSFER"),
      move("3", "OUT", 5, 0),
    ]);
    expect(result.trades[1].realizedPnlUsd).toBe(-50);
    expect(result.trades[1].roiMultiple).toBe(0);
    expect(
      reconstructWallet("wallet", "solana", [
        move("1", "IN", 10, null),
        move("2", "OUT", 10, 100),
      ]).trades[1].realizedPnlUsd,
    ).toBeUndefined();
  });
});

it("invalidates basis when an unobserved balance change appears", () => {
  const buy = move("1", "IN", 10, 100);
  const sell = { ...move("2", "OUT", 15, 300), balanceBefore: 20 };
  const result = reconstructWallet("wallet", "solana", [buy, sell]);
  expect(result.trades[1].realizedPnlUsd).toBeUndefined();
  expect(result.positions[0].costBasisUsd).toBeNull();
});
