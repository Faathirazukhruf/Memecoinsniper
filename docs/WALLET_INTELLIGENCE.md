# Wallet Radar: operation and scope

Wallet Radar now supports validated wallet registration, durable local history, automatic RPC polling, pause/resume, manual sync, removal, observed positions, and evidence-based performance metrics. It does not automatically discover profitable wallets or execute trades.

## Running

Run the engine and web app with pnpm dev. Live tracking requires DEMO_MODE=false (default). Use Add Wallet on /wallets. No private key is required. The engine validates Solana public wallet addresses and EVM addresses and rejects duplicates per chain. Labels are optional; user-provided smart scores are ignored.

The scheduler attempts sync every 30 seconds. Per-wallet jobs are coalesced. A successful sync has a 10-second cooldown; the UI refreshes every 10 seconds. RPC errors are visible and retried by the scheduler. Pausing excludes the wallet from smart-wallet confluence. Removing a wallet deletes its locally recorded history; an in-flight response cannot recreate it.

## Durable storage

Live records are saved to data/wallet-radar.json at the repository root. This directory is gitignored. Optional WALLET_STORE_PATH overrides the file path (prefer an absolute path). Save operations replace the file atomically; corrupt/unsupported storage fails explicitly instead of silently resetting history. Back up this file. Use one engine process per file, not multiple replicas. Wallet data is local even when the journal uses Supabase. Demo mode uses memory only and does not query RPC for wallet activity.

## Coverage and classification

- Solana: the latest 50 owner-address signatures initially, then new finalized signatures. At most 1000 signatures are searched to reconnect to a saved cursor. A missing cursor or missing transaction produces an error without skipping forward. SPL token balance differences provide quantities. Supported swap evidence is Jupiter v6 route logs within its invocation or Raydium AMM v4 swap instruction tags 9/11. Other movements remain transfers/unclassified, rather than being counted as profitable trades. Direct Pump.fun, newer Raydium programs, and other DEX-specific decoders are not yet supported.
- Owner-address history can omit incoming SPL transfers when the owner is not in the transaction account keys. A subsequent observed pre-balance mismatch invalidates the reconstructed basis, preventing an unsupported profit calculation. Positions are observed inventory, not a complete current balance snapshot.
- BSC/Base: ERC-20 Transfer logs involving the wallet, in batches of 200 blocks, starting 1000 blocks behind the first confirmed tip. There is a 20-block confirmation delay. V2/V3 Swap event signatures plus opposing asset movements identify candidate swaps. This is event-based classification, not a contract security audit. Native/internal transfers, rebasing balances, and DEX formats without those events are not reconstructed. Historical decimals calls may require a capable RPC provider.
- EVM catch-up remains PENDING until the confirmed tip is reached. Previously saved cursors advance only after the whole batch is processed and saved.
- Transaction identities deduplicate repeated history. Solana address case is preserved; EVM addresses are normalized to lowercase. Wallet identity includes its chain.

## Valuation and performance

USD estimates are supported only for unambiguous single-token swaps settled against native USDC on Solana or Base, valued at $1 per USDC. This is a par-value estimate, not historical fiat pricing; it excludes gas, rent, and other costs. BSC activity and SOL/BNB/ETH/token-pair swaps remain unpriced. The UI explicitly shows missing values rather than estimating them from current token prices.

FIFO cost basis supports partial exits and remaining inventory. Incoming transfers and unpriced purchases create unknown basis. Selling more inventory than observed, or selling unknown-basis inventory, is excluded from measured PnL. Gross realized PnL, win rate, profit factor, and score use only measured exits. No-loss profit factor is undefined, not 99. Early-entry rate is unavailable without launch-time evidence. An exit with zero proceeds is a loss.

Smart score is a ranking heuristic, not a probability of profit. Confidence is sample size capped at 20 measured exits. Smart confluence requires at least 20 measured exits, positive measured gross PnL, score >=65, an active wallet, READY sync state, a sync in the last two minutes, and remaining observed token inventory. Unpriced and missing history can materially bias measured results; do not treat a score as proof of lifetime profitability.

## API

- GET /api/wallets: tracked profiles and sync states.
- POST /api/wallets: address, chainId, optional label and notes. Persist, then queue sync.
- GET /api/wallets/:chainId/:address: profile, observed movements, reconstructed positions, trades and metrics.
- POST /api/wallets/:chainId/:address/sync: queue/coalesce live sync; rejected in demo or when paused.
- PATCH /api/wallets/:chainId/:address: { paused: true/false }.
- DELETE /api/wallets/:chainId/:address: remove local history.

The existing engine API is intended for a trusted local environment and has no authentication layer; do not expose it publicly as-is.

## Verification

Run pnpm test and pnpm typecheck. Wallet suites cover API lifecycle, persistence after restart, duplicate and cross-chain identities, failed RPC checkpoints, concurrent sync/deletion, FIFO partial sales, missing basis, zero proceeds, balance mismatch, RPC decoding fixtures, and smart confluence.

References: [Solana signatures](https://solana.com/docs/rpc/http/getsignaturesforaddress), [Solana transactions](https://solana.com/docs/rpc/http/gettransaction), [Ethereum JSON-RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/), [Circle USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses), [Jupiter program](https://github.com/jup-ag/jupiter-cpi/blob/main/src/lib.rs), [Raydium instruction tags](https://github.com/raydium-io/raydium-amm/blob/master/program/src/instruction.rs).
