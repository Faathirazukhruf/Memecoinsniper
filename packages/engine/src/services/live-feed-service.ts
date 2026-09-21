import fetch from 'node-fetch';
import { ChainId, NormalizedEvent, SUPPORTED_CHAINS } from '@memesniper/shared';
import { EventEmitter } from 'events';

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    m5: number;
    h1: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  pairCreatedAt?: number;
}

export class LiveMarketFeedService extends EventEmitter {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private processedPairs = new Set<string>();
  private readonly pollDelayMs = 6000; // 6 seconds live poll

  constructor() {
    super();
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Live Feed] Starting Real-Time Multi-Chain Market Ingestion...');

    // Run immediate first fetch
    await this.fetchLatestOpportunities();

    // Loop polling
    this.pollInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.fetchLatestOpportunities();
      }
    }, this.pollDelayMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('[Live Feed] Stopped.');
  }

  private mapChainId(dexChainId: string): ChainId | null {
    const normalized = dexChainId.toLowerCase();
    if (normalized === 'solana') return 'solana';
    if (normalized === 'bsc' || normalized === 'binance') return 'bsc';
    if (normalized === 'base') return 'base';
    return null;
  }

  public async fetchLatestOpportunities(): Promise<void> {
    try {
      // 1. Fetch latest boosted/active token profiles across chains
      const boostUrl = 'https://api.dexscreener.com/token-boosts/latest/v1';
      const boostRes = await fetch(boostUrl, {
        headers: { 'User-Agent': 'MemecoinSniper/1.0' },
      });

      if (boostRes.ok) {
        const boosts = (await boostRes.json()) as any[];
        const targetTokens = boosts
          .filter((b) => ['solana', 'bsc', 'base'].includes(b.chainId?.toLowerCase()))
          .slice(0, 10);

        for (const token of targetTokens) {
          const chainId = this.mapChainId(token.chainId);
          if (!chainId || !token.tokenAddress) continue;
          await this.fetchTokenPairs(chainId, token.tokenAddress);
        }
      }

      // 2. Fetch latest active pairs from key DEX queries (Solana Raydium/Pump, BSC Pancake, Base Uniswap)
      const queries = ['SOL', 'PEPE', 'DOGE', 'CAT', 'PUMP'];
      const randomQuery = queries[Math.floor(Math.random() * queries.length)];
      const searchUrl = `https://api.dexscreener.com/latest/dex/search?q=${randomQuery}`;
      
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'MemecoinSniper/1.0' },
      });

      if (searchRes.ok) {
        const data = (await searchRes.json()) as { pairs?: DexScreenerPair[] };
        if (data.pairs && Array.isArray(data.pairs)) {
          for (const pair of data.pairs) {
            const chainId = this.mapChainId(pair.chainId);
            if (!chainId) continue;

            const liqUsd = pair.liquidity?.usd || 0;
            // Filter realistic liquid memecoins (> $2,000 liquidity)
            if (liqUsd >= 2000) {
              this.processLivePair(chainId, pair);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Live Feed] Data ingestion hiccup: ${(err as Error).message}`);
    }
  }

  public async fetchTokenPairs(chainId: ChainId, tokenAddress: string): Promise<void> {
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MemecoinSniper/1.0' },
      });

      if (!res.ok) return;
      const data = (await res.json()) as { pairs?: DexScreenerPair[] };
      if (data.pairs && data.pairs.length > 0) {
        // Pick primary liquid pair
        const primaryPair = data.pairs.sort(
          (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        if (primaryPair) {
          this.processLivePair(chainId, primaryPair);
        }
      }
    } catch (err) {
      console.warn(`[Live Feed] Fetch token pair error for ${tokenAddress}:`, (err as Error).message);
    }
  }

  private processLivePair(chainId: ChainId, pair: DexScreenerPair): void {
    const pairKey = `${chainId}:${pair.pairAddress.toLowerCase()}`;
    const isNew = !this.processedPairs.has(pairKey);
    this.processedPairs.add(pairKey);

    if (this.processedPairs.size > 2000) {
      const first = this.processedPairs.values().next().value;
      if (first) this.processedPairs.delete(first);
    }

    const price = parseFloat(pair.priceUsd) || 0.000001;
    const liqUsd = pair.liquidity?.usd || 5000;
    const vol5m = pair.volume?.m5 || 0;
    const vol1h = pair.volume?.h1 || 0;
    const buys5m = pair.txns?.m5?.buys || 0;
    const sells5m = pair.txns?.m5?.sells || 0;
    const dexName = pair.dexId || SUPPORTED_CHAINS[chainId].defaultDex;
    const createdAt = pair.pairCreatedAt || Date.now() - 300000;

    // Emit live POOL_CREATED / SWAP events
    const poolEvent: NormalizedEvent = {
      id: `live-pool-${pair.pairAddress.slice(0, 16)}`,
      type: 'POOL_CREATED',
      chainId,
      tokenAddress: pair.baseToken.address,
      poolAddress: pair.pairAddress,
      txHash: `0x${pair.pairAddress.slice(2, 34)}`,
      blockNumber: Math.floor(Date.now() / 1000),
      timestamp: createdAt,
      dex: dexName,
      baseTokenAddress: pair.baseToken.address,
      quoteTokenAddress: pair.quoteToken.address,
      initialLiquidityUsd: liqUsd,
    };

    this.emit('live_event', {
      event: poolEvent,
      metadata: {
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        priceUsd: price,
        liquidityUsd: liqUsd,
        volume5mUsd: vol5m,
        volume1hUsd: vol1h,
        buys5m,
        sells5m,
        dex: dexName,
        createdAt,
        isNew,
      },
    });
  }
}
