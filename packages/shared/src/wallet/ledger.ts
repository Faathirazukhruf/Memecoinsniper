import { ChainId } from "../types/chain";
import { WalletMovement, WalletPosition, WalletTrade } from "../types/wallet";

/** FIFO within observed history. Incoming transfers carry unknown basis. */
export function reconstructWallet(
  walletAddress: string,
  chainId: ChainId,
  movements: WalletMovement[],
) {
  const lots = new Map<
    string,
    {
      quantity: number;
      cost: number | null;
      timestamp: number;
      symbol: string;
    }[]
  >();
  const trades: WalletTrade[] = [];
  const seen = new Set<string>();
  for (const event of [...movements].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  )) {
    if (
      seen.has(event.id) ||
      !Number.isFinite(event.quantity) ||
      event.quantity <= 0
    )
      continue;
    seen.add(event.id);
    const token =
      chainId === "solana"
        ? event.tokenAddress
        : event.tokenAddress.toLowerCase();
    const queue = lots.get(token) ?? [];
    const observed = queue.reduce((sum, lot) => sum + lot.quantity, 0);
    if (
      event.balanceBefore !== undefined &&
      Math.abs(event.balanceBefore - observed) >
        Math.max(1e-9, event.balanceBefore * 1e-9)
    ) {
      // An unobserved transfer or missing earlier history invalidates the previous basis.
      queue.length = 0;
      if (event.balanceBefore > 0)
        queue.push({
          quantity: event.balanceBefore,
          cost: null,
          timestamp: event.timestamp,
          symbol: event.tokenSymbol,
        });
    }
    lots.set(token, queue);
    const valued =
      event.kind === "SWAP" &&
      event.usdValue !== null &&
      Number.isFinite(event.usdValue) &&
      event.usdValue >= 0;
    let cost = 0;
    let duration = 0;
    let covered = true;
    if (event.direction === "IN") {
      queue.push({
        quantity: event.quantity,
        cost: valued ? event.usdValue : null,
        timestamp: event.timestamp,
        symbol: event.tokenSymbol,
      });
    } else {
      let remaining = event.quantity;
      while (remaining > 1e-12 && queue.length) {
        const lot = queue[0];
        const used = Math.min(remaining, lot.quantity);
        const basis =
          lot.cost === null ? null : (lot.cost * used) / lot.quantity;
        if (basis === null) covered = false;
        else {
          cost += basis;
          lot.cost! -= basis;
        }
        duration +=
          used * Math.max(0, (event.timestamp - lot.timestamp) / 1000);
        lot.quantity -= used;
        remaining -= used;
        if (lot.quantity <= 1e-12) queue.shift();
      }
      if (remaining > Math.max(1e-12, event.quantity * 1e-9)) covered = false;
    }
    if (event.kind !== "SWAP") continue;
    const trade: WalletTrade = {
      id: event.id,
      walletAddress,
      chainId,
      tokenAddress: token,
      tokenSymbol: event.tokenSymbol,
      isBuy: event.direction === "IN",
      amountUsd: valued ? event.usdValue! : 0,
      tokenAmount: String(event.quantity),
      priceUsd: valued ? event.usdValue! / event.quantity : 0,
      txHash: event.txHash,
      timestamp: event.timestamp,
    };
    if (!trade.isBuy && valued && covered && cost > 0) {
      trade.realizedPnlUsd = event.usdValue! - cost;
      trade.roiMultiple = event.usdValue! / cost;
      trade.holdDurationSeconds = duration / event.quantity;
    }
    trades.push(trade);
  }
  const positions: WalletPosition[] = [];
  for (const [tokenAddress, queue] of Array.from(lots.entries())) {
    if (!queue.length) continue;
    positions.push({
      tokenAddress,
      tokenSymbol: queue[0].symbol,
      quantity: queue.reduce((sum, lot) => sum + lot.quantity, 0),
      costBasisUsd: queue.some((lot) => lot.cost === null)
        ? null
        : queue.reduce((sum, lot) => sum + lot.cost!, 0),
    });
  }
  return { trades, positions };
}
