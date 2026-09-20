import { describe, it, expect } from 'vitest';
import { evaluateSecurity } from '../packages/shared/src/security/rules.js';

describe('Security / Risk Evaluation Engine', () => {
  it('should flag Honeypot as FAIL with 100 risk score', () => {
    const report = evaluateSecurity({
      tokenAddress: '0x123',
      chainId: 'bsc',
      isHoneypot: true,
      buyTaxPercentage: 0,
      sellTaxPercentage: 0,
    });

    expect(report.status).toBe('FAIL');
    expect(report.riskScore).toBe(100);
    expect(report.flags.some((f) => f.code === 'HONEYPOT_DETECTED')).toBe(true);
  });

  it('should flag high sell tax as FAIL', () => {
    const report = evaluateSecurity({
      tokenAddress: '0x456',
      chainId: 'base',
      isHoneypot: false,
      buyTaxPercentage: 2,
      sellTaxPercentage: 30, // > 25% is critical
    });

    expect(report.status).toBe('FAIL');
    expect(report.flags.some((f) => f.code === 'EXTREME_TAX')).toBe(true);
  });

  it('should PASS clean tokens with revoked mint/freeze and locked LP', () => {
    const report = evaluateSecurity({
      tokenAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      chainId: 'solana',
      isHoneypot: false,
      isMintable: false,
      isFreezable: false,
      isLpLockedOrBurned: true,
      lpLockedPercentage: 100,
      buyTaxPercentage: 0,
      sellTaxPercentage: 0,
    });

    expect(report.status).toBe('PASS');
    expect(report.riskScore).toBe(0);
    expect(report.flags.every((f) => f.passed)).toBe(true);
  });
});
