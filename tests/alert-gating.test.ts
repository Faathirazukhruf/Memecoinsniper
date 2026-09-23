import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../packages/engine/src/config/env.js', () => ({ config: {
  demoMode: false,
  telegram: { enabled: true, botToken: 'test', chatId: 'test', minScore: 80 },
  thresholds: { alertDeduplicationWindowMinutes: 30 },
} }));
vi.mock('../packages/engine/src/db/supabase.js', () => ({ db: {
  hasRecentAlert: vi.fn(), logAlert: vi.fn(),
} }));
import { config } from '../packages/engine/src/config/env';
import { db } from '../packages/engine/src/db/supabase';
import { TelegramNotifier } from '../packages/engine/src/services/telegram-notifier';
import { Signal } from '../packages/shared/src/types/signal';

describe('Alert safety gate', () => {
  beforeEach(() => { vi.clearAllMocks(); config.demoMode = false; });
  it.each(['FAIL', 'WARN', 'UNKNOWN'])('blocks %s even at score 100', async status => {
    const signal = { security: { status }, opportunityScore: { totalScore: 100 } } as Signal;
    expect(await new TelegramNotifier().sendSignalAlert(signal)).toBe(false);
    expect(db.hasRecentAlert).not.toHaveBeenCalled();
    expect(db.logAlert).not.toHaveBeenCalled();
  });
  it('blocks demo alerts even when security passes', async () => {
    config.demoMode = true;
    const signal = { security: { status: 'PASS' }, opportunityScore: { totalScore: 100 } } as Signal;
    expect(await new TelegramNotifier().sendSignalAlert(signal)).toBe(false);
    expect(db.logAlert).not.toHaveBeenCalled();
  });
});
