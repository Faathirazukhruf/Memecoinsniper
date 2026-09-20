import {
  calculateWalletMetrics,
  ChainId,
  WalletActivityEvent,
  WalletProfile,
  WalletTrade,
} from '@memesniper/shared';
import { db } from '../db/supabase.js';

export class WalletRadar {
  private tokenHoldersMap = new Map<string, Set<string>>(); // chain:token -> Set of wallet addresses

  public async trackWallet(profile: WalletProfile): Promise<void> {
    await db.saveWallet(profile);
    console.log(`[Wallet Radar] Tracking wallet: ${profile.address} on ${profile.chainId} (Label: ${profile.label})`);
  }

  public async getTrackedWallets(): Promise<WalletProfile[]> {
    return db.listWallets();
  }

  public isSmartWallet(_chainId: ChainId, _walletAddress: string): boolean {
    return false;
  }

  public getTokenSmartWallets(
    chainId: ChainId,
    tokenAddress: string
  ): { count: number; avgScore: number; addresses: string[] } {
    const key = `${chainId}:${tokenAddress.toLowerCase()}`;
    const holders = this.tokenHoldersMap.get(key);
    if (!holders || holders.size === 0) {
      return { count: 0, avgScore: 0, addresses: [] };
    }
    const addresses = Array.from(holders);
    return {
      count: addresses.length,
      avgScore: 85,
      addresses,
    };
  }

  public async processWalletActivity(event: WalletActivityEvent): Promise<void> {
    const wallet = await db.getWallet(event.chainId, event.walletAddress);
    if (!wallet && !event.smartScore) return;

    const key = `${event.chainId}:${event.tokenAddress.toLowerCase()}`;
    if (!this.tokenHoldersMap.has(key)) {
      this.tokenHoldersMap.set(key, new Set());
    }

    if (event.type === 'WALLET_BUY') {
      this.tokenHoldersMap.get(key)!.add(event.walletAddress.toLowerCase());
    } else {
      this.tokenHoldersMap.get(key)!.delete(event.walletAddress.toLowerCase());
    }

    // Record trade in history
    const trade: WalletTrade = {
      id: `wt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      walletAddress: event.walletAddress,
      chainId: event.chainId,
      tokenAddress: event.tokenAddress,
      tokenSymbol: 'MEME',
      isBuy: event.type === 'WALLET_BUY',
      amountUsd: event.amountUsd,
      tokenAmount: '1000',
      priceUsd: event.priceUsd,
      txHash: event.txHash,
      timestamp: event.timestamp,
    };

    await db.saveWalletTrade(trade);

    // Recompute wallet metrics
    const allTrades = await db.listWalletTrades(event.walletAddress);
    const metrics = calculateWalletMetrics(event.walletAddress, event.chainId, allTrades);
    await db.saveWalletMetrics(metrics);
  }
}
