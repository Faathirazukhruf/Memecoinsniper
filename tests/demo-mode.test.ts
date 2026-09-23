import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
vi.mock('../packages/engine/src/db/supabase.js', () => ({ db: { isCloudConnected: () => false } }));
vi.mock('../packages/engine/src/config/env.js', () => ({ config: { demoMode: false } }));
import { config } from '../packages/engine/src/config/env';
import { createServer } from '../packages/engine/src/server';

describe('Demo API isolation', () => {
  it('rejects simulation in live mode and allows it only in explicit demo mode', async () => {
    const radar = Object.assign(new EventEmitter(), { processEvent: vi.fn().mockResolvedValue(undefined) });
    const app = createServer(new Map(), radar as any, {} as any);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address() as { port: number };
    const url = `http://127.0.0.1:${address.port}`;
    try {
      config.demoMode = false;
      expect((await fetch(url + '/api/simulate', { method: 'POST' })).status).toBe(403);
      expect(radar.processEvent).not.toHaveBeenCalled();
      config.demoMode = true;
      expect((await fetch(url + '/api/health').then(r => r.json())).mode).toBe('demo');
      expect((await fetch(url + '/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(200);
      expect(radar.processEvent).toHaveBeenCalledOnce();
    } finally {
      config.demoMode = false;
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    }
  });
});
