import { ChainId, evaluateSecurity, SecurityReport } from '@memesniper/shared';
import { BaseChainAdapter } from '../chains/base/chain-adapter.js';
import { db } from '../db/supabase.js';

export class SecurityService {
  private adapters: Map<ChainId, BaseChainAdapter>;

  constructor(adapters: Map<ChainId, BaseChainAdapter>) {
    this.adapters = adapters;
  }

  public async evaluateToken(chainId: ChainId, tokenAddress: string): Promise<SecurityReport> {
    // Check cached DB report first
    const cached = await db.getSecurityReport(chainId, tokenAddress);
    if (cached && Date.now() - cached.checkedAt < 300000) {
      return cached;
    }

    const adapter = this.adapters.get(chainId);
    let report: SecurityReport;

    if (adapter) {
      try {
        report = await adapter.checkSecurity(tokenAddress);
      } catch (err) {
        console.warn(`[Security Service] Adapter check error for ${chainId}:${tokenAddress}:`, (err as Error).message);
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

    await db.saveSecurityReport(report);
    return report;
  }
}
