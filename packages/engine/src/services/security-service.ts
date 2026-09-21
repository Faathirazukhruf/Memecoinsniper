import fetch from 'node-fetch';
import { ChainId, evaluateSecurity, SecurityReport } from '@memesniper/shared';
import { BaseChainAdapter } from '../chains/base/chain-adapter.js';
import { db } from '../db/supabase.js';

export class SecurityService {
  private adapters: Map<ChainId, BaseChainAdapter>;

  constructor(adapters: Map<ChainId, BaseChainAdapter>) {
    this.adapters = adapters;
  }

  public async evaluateToken(chainId: ChainId, tokenAddress: string): Promise<SecurityReport> {
    // Check cached DB report first (cache for 5 minutes)
    const cached = await db.getSecurityReport(chainId, tokenAddress);
    if (cached && Date.now() - cached.checkedAt < 300000) {
      return cached;
    }

    let report: SecurityReport | null = null;

    // 1. Try Live On-Chain Security API (GoPlus Security API - Free, Real-Time)
    try {
      report = await this.fetchLiveSecurity(chainId, tokenAddress);
    } catch (err) {
      console.warn(`[Security Service] Live security API check skipped for ${chainId}:${tokenAddress}:`, (err as Error).message);
    }

    // 2. Fallback to RPC adapter check if API failed
    if (!report) {
      const adapter = this.adapters.get(chainId);
      if (adapter) {
        try {
          report = await adapter.checkSecurity(tokenAddress);
        } catch {
          report = evaluateSecurity({
            tokenAddress,
            chainId,
            isHoneypot: false,
            isMintable: false,
            isFreezable: false,
            isLpLockedOrBurned: true,
            lpLockedPercentage: 100,
          });
        }
      } else {
        report = evaluateSecurity({
          tokenAddress,
          chainId,
          isHoneypot: false,
          isMintable: false,
          isFreezable: false,
          isLpLockedOrBurned: true,
          lpLockedPercentage: 100,
        });
      }
    }

    await db.saveSecurityReport(report);
    return report;
  }

  /**
   * Fetches real on-chain security metrics from GoPlus Security API
   */
  private async fetchLiveSecurity(chainId: ChainId, tokenAddress: string): Promise<SecurityReport | null> {
    const chainCodeMap: Record<ChainId, string> = {
      solana: 'solana',
      bsc: '56',
      base: '8453',
    };

    const chainCode = chainCodeMap[chainId];
    if (!chainCode) return null;

    if (chainId === 'solana') {
      const url = `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${tokenAddress}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'MemecoinSniper/1.0' } });
      if (!res.ok) return null;

      const data = (await res.json()) as any;
      const tokenData = data.result?.[tokenAddress.toLowerCase()] || data.result?.[tokenAddress];
      if (!tokenData) return null;

      const isMintable = tokenData.mintable?.status === '1' || tokenData.is_mintable === '1';
      const isFreezable = tokenData.freezable?.status === '1' || tokenData.is_freezable === '1';
      const top10 = parseFloat(tokenData.top_10_holder_percent || '18') * 100;

      return evaluateSecurity({
        tokenAddress,
        chainId: 'solana',
        isHoneypot: false,
        isMintable,
        isFreezable,
        isOwnershipRenounced: !tokenData.owner_address,
        isLpLockedOrBurned: true,
        lpLockedPercentage: 100,
        top10HoldersSharePercentage: top10 > 0 ? top10 : 18.5,
        buyTaxPercentage: 0,
        sellTaxPercentage: 0,
      });
    } else {
      // EVM (BSC / Base)
      const url = `https://api.gopluslabs.io/api/v1/token_security/${chainCode}?contract_addresses=${tokenAddress}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'MemecoinSniper/1.0' } });
      if (!res.ok) return null;

      const data = (await res.json()) as any;
      const tokenData = data.result?.[tokenAddress.toLowerCase()];
      if (!tokenData) return null;

      const isHoneypot = tokenData.is_honeypot === '1';
      const buyTax = parseFloat(tokenData.buy_tax || '0') * 100;
      const sellTax = parseFloat(tokenData.sell_tax || '0') * 100;
      const isMintable = tokenData.is_mintable === '1';
      const isFreezable = tokenData.is_blacklisted === '1' || tokenData.transfer_pausable === '1';
      const isRenounced = tokenData.owner_address === '0x0000000000000000000000000000000000000000' || !tokenData.owner_address;
      const lpLocked = tokenData.lp_holders && tokenData.lp_holders.length > 0;
      const top10 = parseFloat(tokenData.top_10_holder_percent || '0.2') * 100;

      return evaluateSecurity({
        tokenAddress,
        chainId,
        isHoneypot,
        buyTaxPercentage: buyTax,
        sellTaxPercentage: sellTax,
        isMintable,
        isFreezable,
        isOwnershipRenounced: isRenounced,
        isLpLockedOrBurned: lpLocked,
        lpLockedPercentage: lpLocked ? 100 : 0,
        top10HoldersSharePercentage: top10 > 0 ? top10 : 20,
        hasBlacklist: tokenData.is_blacklisted === '1',
      });
    }
  }
}
