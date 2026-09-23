import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('node-fetch', () => ({ default: vi.fn() }));
vi.mock('../packages/engine/src/db/supabase.js', () => ({ db: {
  getSecurityReport: vi.fn().mockResolvedValue(null), saveSecurityReport: vi.fn(),
} }));
import fetch from 'node-fetch';
import { SecurityService, securityBoolean, securityPercentage } from '../packages/engine/src/services/security-service';

describe('Security provider failures and incomplete evidence', () => {
  beforeEach(() => vi.clearAllMocks());
  it('keeps unknown provider fields unknown', () => {
    for (const value of [undefined, null, '', 'invalid']) {
      expect(securityBoolean(value)).toBeNull();
      expect(securityPercentage(value)).toBeNull();
    }
    expect(securityBoolean('0')).toBe(false);
    expect(securityPercentage('0')).toBe(0);
    expect(securityPercentage('0.1')).toBe(10);
  });
  it('returns UNKNOWN when API and adapter both fail', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    const adapter = { checkSecurity: vi.fn().mockRejectedValue(new Error('RPC offline')) };
    const service = new SecurityService(new Map([['solana', adapter as any]]), fetch as any);
    const report = await service.evaluateToken('solana', 'mint');
    expect(report.status).toBe('UNKNOWN');
    expect(report.isHoneypot).toBeNull();
    expect(report.isLpLockedOrBurned).toBeNull();
  });
  it('does not equate LP holders with a verified lock or absent tax with zero', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ code: 1, result: {
      '0xabc': { lp_holders: [{ address: '0x123' }], is_honeypot: '0', is_mintable: '0' },
    } }) } as any);
    const report = await new SecurityService(new Map(), fetch as any).evaluateToken('bsc', '0xabc');
    expect(report.status).toBe('UNKNOWN');
    expect(report.isLpLockedOrBurned).toBeNull();
    expect(report.sellTaxPercentage).toBeNull();
  });
  it('preserves known critical risk even when other fields are missing', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ code: 1, result: {
      '0xabc': { is_honeypot: '1' },
    } }) } as any);
    expect((await new SecurityService(new Map(), fetch as any).evaluateToken('base', '0xabc')).status).toBe('FAIL');
  });
});
