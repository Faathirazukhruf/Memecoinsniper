import {
  ChainId,
  evaluateSecurity,
  PoolMetadata,
  SecurityReport,
  TokenEntity,
} from '@memesniper/shared';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { bsc } from 'viem/chains';
import { BaseChainAdapter } from '../base/chain-adapter.js';

// PancakeSwap Factory Addresses
const PANCAKESWAP_V2_FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const PAIR_CREATED_EVENT = parseAbiItem(
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint)'
);

export class BscAdapter extends BaseChainAdapter {
  public readonly chainId: ChainId = 'bsc';
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
    console.log(`[BSC Adapter] Initializing connection to ${this.rpcUrl}...`);

    try {
      this.client = createPublicClient({
        chain: bsc,
        transport: http(this.rpcUrl),
      });

      this.lastBlockNumber = await this.client.getBlockNumber();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log(`[BSC Adapter] Connected to BSC Mainnet at block #${this.lastBlockNumber}`);

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

          // Query PairCreated logs from PancakeSwap Factory
          const logs = await this.client.getLogs({
            address: PANCAKESWAP_V2_FACTORY as `0x${string}`,
            event: PAIR_CREATED_EVENT,
            fromBlock,
            toBlock,
          });

          for (const log of logs) {
            const { token0, token1, pair } = (log as any).args;
            const isBaseWbnb = token1.toLowerCase() === WBNB_ADDRESS.toLowerCase();
            const tokenAddress = isBaseWbnb ? token0 : token1;
            const quoteAddress = isBaseWbnb ? token1 : token0;

            if (this.deduplicateTx(log.transactionHash)) continue;

            this.emitNormalized({
              id: `bsc-pool-${log.transactionHash.slice(0, 16)}`,
              type: 'POOL_CREATED',
              chainId: 'bsc',
              tokenAddress,
              poolAddress: pair,
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber),
              timestamp: Date.now(),
              dex: 'PancakeSwap v2',
              baseTokenAddress: tokenAddress,
              quoteTokenAddress: quoteAddress,
              initialLiquidityUsd: 10000,
            });
          }
        }
      } catch (err) {
        console.warn(`[BSC Adapter] Block polling hiccup: ${(err as Error).message}`);
      }
    }, 5000);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.isConnected = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.client = null;
    console.log(`[BSC Adapter] Stopped.`);
  }

  async getTokenInfo(address: string): Promise<TokenEntity | null> {
    return {
      address,
      chainId: 'bsc',
      symbol: address.slice(2, 6).toUpperCase(),
      name: `BSC Token ${address.slice(2, 8)}`,
      decimals: 18,
      totalSupply: '1000000000000000000000000',
      createdAt: Date.now(),
    };
  }

  async getPoolInfo(poolAddress: string): Promise<PoolMetadata | null> {
    return {
      id: poolAddress,
      address: poolAddress,
      chainId: 'bsc',
      dex: 'PancakeSwap v2',
      baseTokenAddress: poolAddress,
      quoteTokenAddress: WBNB_ADDRESS,
      quoteTokenSymbol: 'WBNB',
      initialLiquidityUsd: 12000,
      currentLiquidityUsd: 18500,
      reserveBase: '5000000',
      reserveQuote: '32',
      createdAt: Date.now() - 600000,
      lpBurnedOrLocked: true,
      lpLockedPercentage: 99,
    };
  }

  async checkSecurity(tokenAddress: string): Promise<SecurityReport> {
    return evaluateSecurity({ tokenAddress, chainId: this.chainId });
  }
}
