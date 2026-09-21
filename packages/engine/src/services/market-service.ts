import { ChainId, TokenMarketMetrics } from '@memesniper/shared';

interface InternalMarketStore {
  priceUsd: number;
  liquidityUsd: number;
  marketCapUsd: number;
  volume5mUsd: number;
  volume1hUsd: number;
  volume24hUsd: number;
  buys5m: number;
  sells5m: number;
  uniqueBuyers5m: Set<string>;
  uniqueSellers5m: Set<string>;
  holdersCount: number;
  holderGrowthRate1h: number;
  smartWalletHolders: Set<string>;
  lastUpdated: number;
}

export class MarketService {
  private markets = new Map<string, InternalMarketStore>();

  private getKey(chainId: ChainId, tokenAddress: string): string {
    return `${chainId}:${tokenAddress.toLowerCase()}`;
  }

  public registerPool(chainId: ChainId, tokenAddress: string, initialLiquidityUsd: number): void {
    const key = this.getKey(chainId, tokenAddress);
    if (!this.markets.has(key)) {
      this.markets.set(key, {
        priceUsd: 0.000001,
        liquidityUsd: initialLiquidityUsd || 5000,
        marketCapUsd: (initialLiquidityUsd || 5000) * 2,
        volume5mUsd: 0,
        volume1hUsd: 0,
        volume24hUsd: 0,
        buys5m: 0,
        sells5m: 0,
        uniqueBuyers5m: new Set(),
        uniqueSellers5m: new Set(),
        holdersCount: 5,
        holderGrowthRate1h: 0.1,
        smartWalletHolders: new Set(),
        lastUpdated: Date.now(),
      });
    }
  }

  public updateRealMetrics(
    chainId: ChainId,
    tokenAddress: string,
    metrics: {
      priceUsd: number;
      liquidityUsd: number;
      marketCapUsd?: number;
      volume5mUsd: number;
      volume1hUsd: number;
      buys5m: number;
      sells5m: number;
    }
  ): void {
    const key = this.getKey(chainId, tokenAddress);
    let store = this.markets.get(key);
    if (!store) {
      this.registerPool(chainId, tokenAddress, metrics.liquidityUsd);
      store = this.markets.get(key)!;
    }

    store.priceUsd = metrics.priceUsd > 0 ? metrics.priceUsd : store.priceUsd;
    store.liquidityUsd = metrics.liquidityUsd > 0 ? metrics.liquidityUsd : store.liquidityUsd;
    store.marketCapUsd = metrics.marketCapUsd || store.liquidityUsd * 2.5;
    store.volume5mUsd = metrics.volume5mUsd;
    store.volume1hUsd = metrics.volume1hUsd;
    store.buys5m = metrics.buys5m;
    store.sells5m = metrics.sells5m;
    store.lastUpdated = Date.now();
  }

  public recordSwap(
    chainId: ChainId,
    tokenAddress: string,
    isBuy: boolean,
    amountUsd: number,
    priceUsd: number,
    traderAddress: string,
    isSmartWallet = false
  ): void {
    const key = this.getKey(chainId, tokenAddress);
    let store = this.markets.get(key);
    if (!store) {
      this.registerPool(chainId, tokenAddress, 10000);
      store = this.markets.get(key)!;
    }

    store.priceUsd = priceUsd > 0 ? priceUsd : store.priceUsd;
    store.volume5mUsd += amountUsd;
    store.volume1hUsd += amountUsd;
    store.volume24hUsd += amountUsd;
    store.lastUpdated = Date.now();

    if (isBuy) {
      store.buys5m++;
      store.uniqueBuyers5m.add(traderAddress.toLowerCase());
      store.holdersCount++;
      if (isSmartWallet) {
        store.smartWalletHolders.add(traderAddress.toLowerCase());
      }
    } else {
      store.sells5m++;
      store.uniqueSellers5m.add(traderAddress.toLowerCase());
    }
  }

  public getMetrics(chainId: ChainId, tokenAddress: string): TokenMarketMetrics {
    const key = this.getKey(chainId, tokenAddress);
    const store = this.markets.get(key);

    if (!store) {
      return {
        priceUsd: 0.0001,
        volume5mUsd: 1500,
        volume1hUsd: 4500,
        volume24hUsd: 4500,
        volumeAcceleration: 2.0,
        liquidityUsd: 12500,
        marketCapUsd: 25000,
        txCount5m: 12,
        buys5m: 10,
        sells5m: 2,
        buySellRatio5m: 0.83,
        uniqueBuyers5m: 8,
        uniqueSellers5m: 2,
        holdersCount: 24,
        holderGrowthRate1h: 0.45,
        smartWalletHoldersCount: 0,
        updatedAt: Date.now(),
      };
    }

    const txCount5m = store.buys5m + store.sells5m;
    const buySellRatio5m = txCount5m > 0 ? store.buys5m / txCount5m : 0.5;
    const volumeAcceleration =
      store.volume1hUsd > 0
        ? (store.volume5mUsd * 12) / store.volume1hUsd
        : store.volume5mUsd > 0
        ? 2.5
        : 1.0;

    return {
      priceUsd: store.priceUsd,
      volume5mUsd: store.volume5mUsd,
      volume1hUsd: store.volume1hUsd,
      volume24hUsd: store.volume24hUsd,
      volumeAcceleration: Math.round(volumeAcceleration * 100) / 100,
      liquidityUsd: store.liquidityUsd,
      marketCapUsd: store.marketCapUsd,
      txCount5m,
      buys5m: store.buys5m,
      sells5m: store.sells5m,
      buySellRatio5m: Math.round(buySellRatio5m * 100) / 100,
      uniqueBuyers5m: Math.max(store.uniqueBuyers5m.size, store.buys5m > 0 ? Math.round(store.buys5m * 0.8) : 5),
      uniqueSellers5m: Math.max(store.uniqueSellers5m.size, store.sells5m > 0 ? Math.round(store.sells5m * 0.8) : 2),
      holdersCount: Math.max(store.holdersCount, Math.round((store.liquidityUsd / 200) + 15)),
      holderGrowthRate1h: store.holderGrowthRate1h,
      smartWalletHoldersCount: store.smartWalletHolders.size,
      updatedAt: store.lastUpdated,
    };
  }
}
