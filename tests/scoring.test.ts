import { describe, it, expect } from 'vitest';
import { calculateOpportunityScore } from '../packages/shared/src/scoring/calculator.js';

describe('Opportunity Scoring Calculator', () => {
  it('should calculate high score for token with strong confluence and clean security', () => {
    const score = calculateOpportunityScore({
      tokenCreatedAt: Date.now() - 5 * 60 * 1000, // 5 mins old
      market: {
        liquidityUsd: 45000,
        volume5mUsd: 30000,
        volume1hUsd: 40000,
        volumeAcceleration: 3.5,
        buys5m: 45,
        sells5m: 5,
        uniqueBuyers5m: 35,
        holdersCount: 150,
      },
      security: {
        tokenAddress: '0x123',
        chainId: 'solana',
        status: 'PASS',
        riskScore: 0,
        isHoneypot: false,
        buyTaxPercentage: 0,
        sellTaxPercentage: 0,
        isMintable: false,
        isFreezable: false,
        isLpLockedOrBurned: true,
        lpLockedPercentage: 100,
        flags: [],
        checkedAt: Date.now(),
      },
      smartWalletsCount: 3,
      smartWalletAvgScore: 90,
    });

    expect(score.totalScore).toBeGreaterThanOrEqual(85);
    expect(score.isHighPriority).toBe(true);
    expect(score.breakdown.liquidity.score).toBeGreaterThan(10);
    expect(score.breakdown.smartWallet.score).toBe(20);
    expect(score.breakdown.security.score).toBe(20);
  });

  it('should penalize tokens with FAIL security status', () => {
    const score = calculateOpportunityScore({
      tokenCreatedAt: Date.now() - 10 * 60 * 1000,
      market: {
        liquidityUsd: 50000,
        volume5mUsd: 10000,
      },
      security: {
        tokenAddress: '0x123',
        chainId: 'bsc',
        status: 'FAIL',
        riskScore: 100,
        isHoneypot: true,
        flags: [
          {
            code: 'HONEYPOT_DETECTED',
            name: 'Honeypot',
            severity: 'CRITICAL',
            description: 'Cannot sell',
            passed: false,
          },
        ],
        checkedAt: Date.now(),
      },
      smartWalletsCount: 0,
    });

    expect(score.breakdown.security.score).toBe(0);
    expect(score.isHighPriority).toBe(false);
  });
});
