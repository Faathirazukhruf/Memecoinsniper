import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import {
  ChainId,
  TrackedWallet,
  WalletMovement,
  walletKey,
} from "@memesniper/shared";

export interface WalletRecord {
  wallet: TrackedWallet;
  movements: WalletMovement[];
}
/** Single-engine store. Atomic replacement; do not silently reset corrupt history. */
export class WalletStore {
  private records: Record<string, WalletRecord> = {};
  constructor(private file?: string) {
    if (file && existsSync(file)) {
      const data = JSON.parse(readFileSync(file, "utf8"));
      if (
        data.version !== 1 ||
        !data.records ||
        typeof data.records !== "object"
      )
        throw new Error("Unsupported wallet store format");
      this.records = data.records;
      for (const record of Object.values(this.records)) {
        if (!record.wallet || !Array.isArray(record.movements))
          throw new Error("Invalid wallet store");
        if (record.wallet.sync.status === "SYNCING")
          record.wallet.sync.status = "PENDING";
      }
    }
  }
  list(): WalletRecord[] {
    return structuredClone(Object.values(this.records));
  }
  get(chain: ChainId, address: string): WalletRecord | null {
    return structuredClone(this.records[walletKey(chain, address)] ?? null);
  }
  save(record: WalletRecord): void {
    const next = {
      ...this.records,
      [walletKey(record.wallet.chainId, record.wallet.address)]:
        structuredClone(record),
    };
    this.persist(next);
  }
  remove(chain: ChainId, address: string): void {
    const next = { ...this.records };
    delete next[walletKey(chain, address)];
    this.persist(next);
  }
  private persist(next: Record<string, WalletRecord>): void {
    if (this.file) {
      mkdirSync(path.dirname(this.file), { recursive: true });
      writeFileSync(
        this.file + ".tmp",
        JSON.stringify({ version: 1, records: next }),
        "utf8",
      );
      renameSync(this.file + ".tmp", this.file);
    }
    this.records = next;
  }
}
