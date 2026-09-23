import fetch from 'node-fetch';
import { ChainId, evaluateSecurity, SecurityReport } from '@memesniper/shared';
import { BaseChainAdapter } from '../chains/base/chain-adapter.js';
import { config } from '../config/env.js';
import { db } from '../db/supabase.js';

export function securityBoolean(value: unknown): boolean | null {
  if (value === '1' || value === 1 || value === true) return true;
  if (value === '0' || value === 0 || value === false) return false;
  return null;
}
export function securityPercentage(value: unknown): number | null {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number * 100 : null;
}
function anyRisk(a: boolean | null, b: boolean | null): boolean | null {
  return a === true || b === true ? true : a === false && b === false ? false : null;
}

export class SecurityService {
  constructor(private adapters: Map<ChainId, BaseChainAdapter>, private request: typeof fetch = fetch) {}

  public async evaluateToken(chainId: ChainId, tokenAddress: string): Promise<SecurityReport> {
    if (config.demoMode) return evaluateSecurity({ tokenAddress, chainId });
    const cached = await db.getSecurityReport(chainId, tokenAddress);
    if (cached && Date.now() - cached.checkedAt < 300000) return cached;
    let report: SecurityReport | null = null;
    try {
      report = await this.fetchLiveSecurity(chainId, tokenAddress);
    } catch {
      // Network and malformed responses are unknown, never evidence of safety.
    }
    if (!report) {
      try {
        report = await this.adapters.get(chainId)?.checkSecurity(tokenAddress) ?? null;
      } catch {
        // Keep unavailable checks unknown.
      }
    }
    report ??= evaluateSecurity({ tokenAddress, chainId });
    await db.saveSecurityReport(report);
    return report;
  }

  private async fetchLiveSecurity(chainId: ChainId, tokenAddress: string): Promise<SecurityReport | null> {
    const endpoint = chainId === 'solana' ? 'solana/token_security' : 'token_security/' + (chainId === 'bsc' ? '56' : '8453');
    const res = await this.request('https://api.gopluslabs.io/api/v1/' + endpoint + '?contract_addresses=' + encodeURIComponent(tokenAddress), {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (Number(data.code) !== 1) return null;
    const raw = data.result?.[chainId === 'solana' ? tokenAddress : tokenAddress.toLowerCase()];
    if (!raw || typeof raw !== 'object') return null;
    const solana = chainId === 'solana';
    const blacklist = securityBoolean(raw.is_blacklisted);
    return evaluateSecurity({
      tokenAddress,
      chainId,
      isHoneypot: solana ? null : securityBoolean(raw.is_honeypot),
      isMintable: securityBoolean(solana ? raw.mintable?.status ?? raw.is_mintable : raw.is_mintable),
      isFreezable: solana ? securityBoolean(raw.freezable?.status ?? raw.is_freezable) : anyRisk(blacklist, securityBoolean(raw.transfer_pausable)),
      hasBlacklist: blacklist,
      buyTaxPercentage: solana ? null : securityPercentage(raw.buy_tax),
      sellTaxPercentage: solana ? null : securityPercentage(raw.sell_tax),
      top10HoldersSharePercentage: securityPercentage(raw.top_10_holder_percent),
      // A holder list does not prove a lock. Pool-specific verification is still required.
      isLpLockedOrBurned: null,
      lpLockedPercentage: null,
      isOwnershipRenounced: typeof raw.owner_address === 'string'
        ? raw.owner_address === '' || raw.owner_address === '0x0000000000000000000000000000000000000000'
        : null,
    });
  }
}
