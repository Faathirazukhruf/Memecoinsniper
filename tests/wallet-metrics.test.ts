import { describe, it, expect } from 'vitest';
import { calculateWalletMetrics } from '../packages/shared/src/wallet/metrics.js';
import { WalletTrade } from '../packages/shared/src/types/wallet.js';

describe('Wallet Metrics & Intelligence Engine', () => {
  it('should accurately calculate win rate, profit factor, and smart score', () => {
    const mockTrades: WalletTrade[] = [
      {
        id: 't1',
        walletAddress: '0xabc',
        chainId: 'solana',
        tokenAddress: 'tok1',
        tokenSymbol: 'AAA',
        isBuy: true,
        amountUsd: 1000,
        tokenAmount: '100',
        priceUsd: 10,
        txHash: '0x1',
        timestamp: Date.now() - 100000,
        roiMultiple: 5.0,
        realizedPnlUsd: 4000,
        holdDurationSeconds: 120,
      },
      {
        id: 't2',
        walletAddress: '0xabc',
        chainId: 'solana',
        tokenAddress: 'tok2',
        tokenSymbol: 'BBB',
        isBuy: true,
        amountUsd: 1000,
        tokenAmount: '100',
        priceUsd: 10,
        txHash: '0x2',
        timestamp: Date.now() - 50000,
        roiMultiple: 3.0,
        realizedPnlUsd: 2000,
        holdDurationSeconds: 240,
      },
      {
        id: 't3',
        walletAddress: '0xabc',
        chainId: 'solana',
        tokenAddress: 'tok3',
        tokenSymbol: 'CCC',
        isBuy: true,
        amountUsd: 1000,
        tokenAmount: '100',
        priceUsd: 10,
        txHash: '0x3',
        timestamp: Date.now() - 20000,
        roiMultiple: 0.5,
        realizedPnlUsd: -500,
        holdDurationSeconds: 60,
      },
    ];

    const metrics = calculateWalletMetrics('0xabc', 'solana', mockTrades);

    expect(metrics.totalTrades).toBe(3);
    expect(metrics.winningTrades).toBe(2);
    expect(metrics.losingTrades).toBe(1);
    expect(metrics.winRate).toBeCloseTo(0.667, 2);
    expect(metrics.realizedPnlUsd).toBe(5500);
    expect(metrics.profitFactor).toBe(12.0); // 6000 gain / 500 loss = 12
    expect(metrics.smartScore).toBeGreaterThan(40);
  });
});
