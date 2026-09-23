import {
  ChainId,
  evaluateSecurity,
  PoolMetadata,
  SecurityReport,
  TokenEntity,
} from '@memesniper/shared';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { BaseChainAdapter } from './chain-adapter.js';

// Base DEX Factory Addresses
const UNISWAP_V3_FACTORY_BASE = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const WETH_BASE = '0x4200000000000000000000000000000000000006';

const POOL_CREATED_EVENT = parseAbiItem(
  'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)'
);

export class BaseAdapter extends BaseChainAdapter {
  public readonly chainId: ChainId = 'base';
  private client: any = null;
  private rpcUrl: string;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastBlockNumber = 0n;

  constructor(rpcUrl: string, _wsUrl?: string) {
    super();
    this.rpcUrl = rpcUrl;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Base Adapter] Initializing connection to ${this.rpcUrl}...`);

    try {
      this.client = createPublicClient({
        chain: base,
        transport: http(this.rpcUrl),
      });

      this.lastBlockNumber = await this.client.getBlockNumber();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log(`[Base Adapter] Connected to Base Mainnet at block #${this.lastBlockNumber}`);

      // Start event polling
      this.startBlockPolling();
    } catch (err) {
      this.handleConnectionError(err as Error, () => this.start());
    }
  }

  private startBlockPolling(): void {
    this.pollInterval = setInterval(async () => {
      if (!this.isRunning || !this.client) return;

      try {
        const currentBlock = await this.client.getBlockNumber();
        if (currentBlock > this.lastBlockNumber) {
          const fromBlock = this.lastBlockNumber + 1n;
          const toBlock = currentBlock;
          this.lastBlockNumber = currentBlock;

          // Query PoolCreated logs from Uniswap v3 Factory on Base
          const logs = await this.client.getLogs({
            address: UNISWAP_V3_FACTORY_BASE as `0x${string}`,
            event: POOL_CREATED_EVENT,
            fromBlock,
            toBlock,
          });

          for (const log of logs) {
            const { token0, token1, pool } = (log as any).args;
            const isBaseWeth = token1.toLowerCase() === WETH_BASE.toLowerCase();
            const tokenAddress = isBaseWeth ? token0 : token1;
            const quoteAddress = isBaseWeth ? token1 : token0;

            if (this.deduplicateTx(log.transactionHash)) continue;

            this.emitNormalized({
              id: `base-pool-${log.transactionHash.slice(0, 16)}`,
              type: 'POOL_CREATED',
              chainId: 'base',
              tokenAddress,
              poolAddress: pool,
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber),
              timestamp: Date.now(),
              dex: 'Uniswap v3',
              baseTokenAddress: tokenAddress,
              quoteTokenAddress: quoteAddress,
              initialLiquidityUsd: 15000,
            });
          }
        }
      } catch (err) {
        console.warn(`[Base Adapter] Block polling hiccup: ${(err as Error).message}`);
      }
    }, 4000);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.isConnected = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.client = null;
    console.log(`[Base Adapter] Stopped.`);
  }

  async getTokenInfo(address: string): Promise<TokenEntity | null> {
    return {
      address,
      chainId: 'base',
      symbol: address.slice(2, 6).toUpperCase(),
      name: `Base Token ${address.slice(2, 8)}`,
      decimals: 18,
      totalSupply: '1000000000000000000000000',
      createdAt: Date.now(),
    };
  }

  async getPoolInfo(poolAddress: string): Promise<PoolMetadata | null> {
    return {
      id: poolAddress,
      address: poolAddress,
      chainId: 'base',
      dex: 'Uniswap v3',
      baseTokenAddress: poolAddress,
      quoteTokenAddress: WETH_BASE,
      quoteTokenSymbol: 'WETH',
      initialLiquidityUsd: 20000,
      currentLiquidityUsd: 28000,
      reserveBase: '2500000',
      reserveQuote: '8.5',
      createdAt: Date.now() - 450000,
      lpBurnedOrLocked: true,
      lpLockedPercentage: 100,
    };
  }

  async checkSecurity(tokenAddress: string): Promise<SecurityReport> {
    return evaluateSecurity({ tokenAddress, chainId: this.chainId });
  }
}
