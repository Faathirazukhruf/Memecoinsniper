import { ChainId, TrackedWallet, WalletMovement } from "@memesniper/shared";
import { keccak256, toHex } from "viem";
import { config } from "../config/env.js";

export type RpcCall = (
  chain: ChainId,
  method: string,
  params: unknown[],
) => Promise<any>;
export interface WalletBatch {
  caughtUp?: boolean;
  movements: WalletMovement[];
  cursor?: string;
  coverage: string;
}
export interface WalletSource {
  fetch(wallet: TrackedWallet): Promise<WalletBatch>;
}
export const USDC: Partial<Record<ChainId, string>> = {
  solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  base: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
};
const WSOL = "So11111111111111111111111111111111111111112";
const TRANSFER = keccak256(toHex("Transfer(address,address,uint256)"));
const SWAPS = new Set([
  keccak256(toHex("Swap(address,uint256,uint256,uint256,uint256,address)")),
  keccak256(toHex("Swap(address,address,int256,int256,uint160,uint128,int24)")),
]);
export const defaultRpc: RpcCall = async (chain, method, params) => {
  if (!config.chains[chain].enabled)
    throw new Error("Chain disabled in engine configuration");
  let response: Response;
  try {
    response = await fetch(config.chains[chain].rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "RPC connection failed or timed out; check the configured provider",
    );
  }
  if (!response.ok)
    throw new Error(
      "RPC HTTP " +
        response.status +
        "; retry later or configure a provider with sufficient capacity",
    );
  const data = (await response.json()) as any;
  if (data.error)
    throw new Error(
      "RPC rejected " + method + " (code " + data.error.code + ")",
    );
  if (!Object.hasOwn(data, "result"))
    throw new Error("RPC response missing result");
  return data.result;
};
interface Delta {
  address: string;
  symbol: string;
  amount: number;
}
function movementsFromDeltas(
  chain: ChainId,
  hash: string,
  timestamp: number,
  order: number,
  deltas: Delta[],
  swap: boolean,
): WalletMovement[] {
  const active = deltas.filter(
    (d) => Number.isFinite(d.amount) && Math.abs(d.amount) > 1e-12,
  );
  const quote = active.find((d) => d.address === USDC[chain]);
  const native = active.find(
    (d) => d.address === "native" || d.address === WSOL,
  );
  const tokens = active.filter(
    (d) =>
      d.address !== USDC[chain] && d.address !== "native" && d.address !== WSOL,
  );
  const singleSettlement =
    swap &&
    tokens.length === 1 &&
    quote &&
    active.length === 2 &&
    quote.amount * tokens[0].amount < 0;
  return tokens.map((d) => ({
    id: chain + ":" + hash + ":" + d.address,
    tokenAddress: d.address,
    tokenSymbol: d.symbol,
    quantity: Math.abs(d.amount),
    direction: d.amount > 0 ? "IN" : "OUT",
    kind: swap ? "SWAP" : "TRANSFER",
    usdValue: singleSettlement ? Math.abs(quote!.amount) : null,
    quoteSymbol: singleSettlement
      ? "USDC"
      : native && swap
        ? "SOL/native (unpriced)"
        : undefined,
    quoteAmount: singleSettlement ? Math.abs(quote!.amount) : undefined,
    txHash: hash,
    timestamp,
    order,
  }));
}

export function decodeSolana(
  wallet: string,
  hash: string,
  tx: any,
  order: number,
): WalletMovement[] {
  if (!tx?.meta)
    throw new Error("Transaction metadata unavailable; cursor retained");
  if (tx.meta.err) return [];
  if (!Number.isFinite(tx.blockTime))
    throw new Error("Transaction timestamp unavailable; cursor retained");
  const changes = new Map<string, Delta>();
  const beforeBalances = new Map<string, number>();
  for (const [rows, sign] of [
    [tx.meta.preTokenBalances, -1],
    [tx.meta.postTokenBalances, 1],
  ] as const) {
    for (const balance of rows ?? []) {
      if (balance.owner !== wallet) continue;
      const amount =
        Number(balance.uiTokenAmount.amount) /
        10 ** balance.uiTokenAmount.decimals;
      if (sign === -1)
        beforeBalances.set(
          balance.mint,
          (beforeBalances.get(balance.mint) ?? 0) + amount,
        );
      const entry = changes.get(balance.mint) ?? {
        address: balance.mint,
        symbol: balance.mint.slice(0, 6),
        amount: 0,
      };
      entry.amount += sign * amount;
      changes.set(balance.mint, entry);
    }
  }
  const keys = tx.transaction.message.accountKeys;
  const index = keys.findIndex(
    (key: any) => (typeof key === "string" ? key : key.pubkey) === wallet,
  );
  if (index >= 0) {
    const delta =
      (tx.meta.postBalances[index] -
        tx.meta.preBalances[index] +
        (index === 0 ? tx.meta.fee : 0)) /
      1e9;
    if (Math.abs(delta) > 0.00001)
      changes.set("native", {
        address: "native",
        symbol: "SOL",
        amount: delta,
      });
  }
  const instructions = [
    ...(tx.transaction.message.instructions ?? []),
    ...(tx.meta.innerInstructions ?? []).flatMap(
      (group: any) => group.instructions ?? [],
    ),
  ];
  const raydiumSwap = instructions.some((instruction: any) => {
    if (
      instruction.programId !==
        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8" ||
      typeof instruction.data !== "string"
    )
      return false;
    const alphabet =
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    if (!instruction.data.length || instruction.data[0] === "1") return false;
    let value = 0n;
    for (const char of instruction.data) {
      const digit = alphabet.indexOf(char);
      if (digit < 0) return false;
      value = value * 58n + BigInt(digit);
    }
    let hex = value.toString(16);
    if (hex.length % 2) hex = "0" + hex;
    return hex.length === 34 && [9, 11].includes(parseInt(hex.slice(0, 2), 16));
  });
  // Only accept route logs inside the actual Jupiter invocation, not arbitrary token log text.
  const stack: string[] = [];
  let jupiterSwap = false;
  for (const line of tx.meta.logMessages ?? []) {
    const invoke = /^Program (\w+) invoke/.exec(line);
    if (invoke) stack.push(invoke[1]);
    else if (/^Program \w+ (success|failed)/.test(line)) stack.pop();
    else if (
      stack[stack.length - 1] ===
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" &&
      /Program log: Instruction: (Route|SharedAccountsRoute|ExactOutRoute)/.test(
        line,
      )
    )
      jupiterSwap = true;
  }
  const swapInstruction = raydiumSwap || jupiterSwap;
  const values = [...changes.values()];
  const swap =
    swapInstruction &&
    values.some((d) => d.amount > 0) &&
    values.some((d) => d.amount < 0);
  // Native rent changes must not invalidate an otherwise unambiguous USDC settlement.
  const tokenValues = values.filter((d) => d.address !== "native");
  return movementsFromDeltas(
    "solana",
    hash,
    tx.blockTime * 1000,
    order,
    tokenValues,
    swap,
  ).map((m) => ({
    ...m,
    balanceBefore: beforeBalances.get(m.tokenAddress) ?? 0,
  }));
}

export class RpcWalletSource implements WalletSource {
  constructor(private rpc: RpcCall = defaultRpc) {}
  async fetch(wallet: TrackedWallet): Promise<WalletBatch> {
    return wallet.chainId === "solana" ? this.solana(wallet) : this.evm(wallet);
  }
  private async solana(wallet: TrackedWallet): Promise<WalletBatch> {
    const signatures: any[] = [];
    let before: string | undefined;
    let found = false;
    const initial = !wallet.sync.cursor;
    for (let page = 0; page < (initial ? 1 : 20); page++) {
      const rows = await this.rpc("solana", "getSignaturesForAddress", [
        wallet.address,
        { limit: 50, commitment: "finalized", ...(before ? { before } : {}) },
      ]);
      if (!Array.isArray(rows)) throw new Error("Invalid signature response");
      for (const row of rows) {
        if (row.signature === wallet.sync.cursor) {
          found = true;
          break;
        }
        signatures.push(row);
      }
      if (found || rows.length < 50 || initial) break;
      before = rows[rows.length - 1].signature;
    }
    if (!initial && !found && signatures.length > 0)
      throw new Error(
        "History gap: previous signature not found within 1000 transactions; cursor retained",
      );
    const movements: WalletMovement[] = [];
    for (const [index, row] of [...signatures].reverse().entries()) {
      if (row.err) continue;
      const tx = await this.rpc("solana", "getTransaction", [
        row.signature,
        {
          encoding: "jsonParsed",
          commitment: "finalized",
          maxSupportedTransactionVersion: 0,
        },
      ]);
      if (!tx)
        throw new Error(
          "Finalized transaction unavailable; cursor retained for retry",
        );
      // Preserve RPC chronology within the same slot across polling cycles.
      movements.push(
        ...decodeSolana(
          wallet.address,
          row.signature,
          tx,
          row.slot * 10000 + index,
        ),
      );
    }
    return {
      movements,
      cursor: signatures[0]?.signature ?? wallet.sync.cursor,
      coverage: initial
        ? "Initial window: latest 50 address transactions; subsequent finalized transactions tracked. Not lifetime history."
        : wallet.sync.coverage,
    };
  }
  private async evm(wallet: TrackedWallet): Promise<WalletBatch> {
    const chain = wallet.chainId;
    const chainId = await this.rpc(chain, "eth_chainId", []);
    if (Number(chainId) !== (chain === "base" ? 8453 : 56))
      throw new Error("RPC chain does not match wallet chain");
    const tip = Number(await this.rpc(chain, "eth_blockNumber", [])) - 20;
    const from = wallet.sync.cursor
      ? Number(wallet.sync.cursor) + 1
      : Math.max(0, tip - 999);
    if (from > tip)
      return {
        movements: [],
        cursor: wallet.sync.cursor,
        coverage: wallet.sync.coverage,
      };
    const to = Math.min(tip, from + 199);
    const hex = (value: number) => "0x" + value.toString(16);
    const topic =
      "0x" + wallet.address.slice(2).toLowerCase().padStart(64, "0");
    const logs: any[] = [];
    for (const topics of [
      [TRANSFER, topic],
      [TRANSFER, null, topic],
    ]) {
      const rows = await this.rpc(chain, "eth_getLogs", [
        { fromBlock: hex(from), toBlock: hex(to), topics },
      ]);
      if (!Array.isArray(rows))
        throw new Error("Invalid transfer log response");
      logs.push(...rows);
    }
    const hashes = [
      ...new Set(
        logs.filter((log) => !log.removed).map((log) => log.transactionHash),
      ),
    ];
    const movements: WalletMovement[] = [];
    for (const hash of hashes) {
      const receipt = await this.rpc(chain, "eth_getTransactionReceipt", [
        hash,
      ]);
      if (!receipt) throw new Error("Receipt unavailable; cursor retained");
      if (Number(receipt.status) !== 1) continue;
      const block = await this.rpc(chain, "eth_getBlockByNumber", [
        receipt.blockNumber,
        false,
      ]);
      if (!block?.timestamp)
        throw new Error("Block unavailable; cursor retained");
      const amounts = new Map<string, bigint>();
      for (const log of receipt.logs) {
        if (
          log.topics[0] !== TRANSFER ||
          log.topics.length !== 3 ||
          !/^0x[0-9a-fA-F]{64}$/.test(log.data)
        )
          continue;
        const token = log.address.toLowerCase();
        const value = BigInt(log.data);
        const delta =
          (log.topics[2].toLowerCase() === topic ? value : 0n) -
          (log.topics[1].toLowerCase() === topic ? value : 0n);
        if (delta !== 0n)
          amounts.set(token, (amounts.get(token) ?? 0n) + delta);
      }
      const deltas: Delta[] = [];
      for (const [address, amount] of amounts) {
        const encoded = await this.rpc(chain, "eth_call", [
          { to: address, data: "0x313ce567" },
          receipt.blockNumber,
        ]);
        const decimals = Number(encoded);
        if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36)
          throw new Error("Token decimals unavailable; cursor retained");
        deltas.push({
          address,
          symbol: address === USDC[chain] ? "USDC" : address.slice(0, 8),
          amount: Number(amount) / 10 ** decimals,
        });
      }
      const swap =
        receipt.logs.some((log: any) => SWAPS.has(log.topics[0])) &&
        deltas.some((d) => d.amount > 0) &&
        deltas.some((d) => d.amount < 0);
      movements.push(
        ...movementsFromDeltas(
          chain,
          hash,
          Number(block.timestamp) * 1000,
          Number(receipt.blockNumber) * 100000 +
            Number(receipt.transactionIndex),
          deltas,
          swap,
        ),
      );
    }
    return {
      movements,
      cursor: String(to),
      caughtUp: to === tip,
      coverage:
        "ERC-20 transfers and V2/V3 swap logs from an initial 1000-block window; scanned through block " +
        to +
        ". Native/internal transfers and earlier history excluded; 20-block confirmation delay.",
    };
  }
}
