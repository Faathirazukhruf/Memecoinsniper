import { describe, it, expect } from 'vitest';
import { NormalizedEvent } from '../packages/shared/src/types/event.js';

describe('Event Normalization & Structure', () => {
  it('should enforce proper structure across normalized events', () => {
    const poolEvent: NormalizedEvent = {
      id: 'sol-pool-1',
      type: 'POOL_CREATED',
      chainId: 'solana',
      tokenAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      poolAddress: 'pool-123',
      txHash: '0xabc',
      blockNumber: 123456,
      timestamp: Date.now(),
      dex: 'Raydium',
      baseTokenAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      quoteTokenAddress: 'So11111111111111111111111111111111111111112',
      initialLiquidityUsd: 15000,
    };

    expect(poolEvent.type).toBe('POOL_CREATED');
    expect(poolEvent.chainId).toBe('solana');
    expect(poolEvent.initialLiquidityUsd).toBe(15000);
  });
});
