import express, { Express } from 'express';
import cors from 'cors';
import {
  ChainId,
  JournalTrade,
  OpportunityMode,
  SUPPORTED_CHAINS,
  WalletProfile,
} from '@memesniper/shared';
import { db } from './db/supabase.js';
import { BaseChainAdapter } from './chains/base/chain-adapter.js';
import { TokenRadar } from './radars/token-radar.js';
import { WalletRadar } from './radars/wallet-radar.js';

export function createServer(
  adapters: Map<ChainId, BaseChainAdapter>,
  tokenRadar: TokenRadar,
  walletRadar: WalletRadar
): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health / Status
  app.get('/api/health', (_req, res) => {
    const chainStats = Array.from(adapters.entries()).map(([id, adapter]) => ({
      ...adapter.getStats(),
      name: SUPPORTED_CHAINS[id].name,
    }));

    res.json({
      status: 'online',
      version: '1.0.0',
      cloudDbConnected: db.isCloudConnected(),
      timestamp: Date.now(),
      chains: chainStats,
    });
  });

  // Screener / Signals endpoint
  app.get('/api/signals', async (req, res) => {
    try {
      const minScore = req.query.minScore ? parseInt(req.query.minScore as string, 10) : 0;
      const chainId = req.query.chainId as ChainId | undefined;
      const mode = req.query.mode as OpportunityMode | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      let signals = await db.listSignals({ minScore, limit: 100 });
      if (chainId) {
        signals = signals.filter((s) => s.chainId === chainId);
      }
      if (mode) {
        signals = signals.filter((s) => s.mode === mode);
      }

      res.json({
        total: signals.length,
        signals: signals.slice(0, limit),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Token Detail
  app.get('/api/tokens/:chainId/:address', async (req, res) => {
    try {
      const { chainId, address } = req.params;
      const token = await db.getToken(chainId as ChainId, address);
      const security = await db.getSecurityReport(chainId as ChainId, address);
      const signals = await db.listSignals({ limit: 100 });
      const signal = signals.find(
        (s) => s.chainId === chainId && s.tokenAddress.toLowerCase() === address.toLowerCase()
      );

      if (!token && !signal) {
        return res.status(404).json({ error: 'Token not found' });
      }

      res.json({
        token: token || signal?.token,
        security: security || signal?.security,
        signal: signal || null,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Wallets endpoint
  app.get('/api/wallets', async (_req, res) => {
    try {
      const wallets = await db.listWallets();
      res.json({ wallets });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/wallets', async (req, res) => {
    try {
      const body = req.body as WalletProfile;
      if (!body.address || !body.chainId) {
        return res.status(400).json({ error: 'address and chainId are required' });
      }
      const profile: WalletProfile = {
        address: body.address,
        chainId: body.chainId,
        label: body.label || 'Custom Tracked Wallet',
        category: body.category || 'SMART_TRADER',
        isWatchlisted: true,
        smartScore: body.smartScore || 75,
        notes: body.notes || '',
        firstSeenAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      await walletRadar.trackWallet(profile);
      res.status(201).json(profile);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/wallets/:chainId/:address', async (req, res) => {
    try {
      const { chainId, address } = req.params;
      const wallet = await db.getWallet(chainId as ChainId, address);
      const trades = await db.listWalletTrades(address);
      const metrics = await db.getWalletMetrics(chainId as ChainId, address);

      res.json({
        wallet: wallet || {
          address,
          chainId,
          label: 'Tracked Wallet',
          category: 'SMART_TRADER',
          smartScore: 80,
        },
        metrics,
        trades,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Trade Journal endpoints
  app.get('/api/journal', async (_req, res) => {
    try {
      const trades = await db.listTrades();
      res.json({ trades });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/journal', async (req, res) => {
    try {
      const body = req.body as Partial<JournalTrade>;
      const trade: JournalTrade = {
        id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tokenAddress: body.tokenAddress || '',
        tokenSymbol: body.tokenSymbol || 'MEME',
        tokenName: body.tokenName || 'Meme Token',
        chainId: body.chainId || 'solana',
        dex: body.dex || 'Raydium',
        status: body.status || 'OPEN',
        signalId: body.signalId,
        signalType: body.signalType,
        opportunityScoreAtEntry: body.opportunityScoreAtEntry,
        entryTimestamp: body.entryTimestamp || Date.now(),
        exitTimestamp: body.exitTimestamp,
        entryPriceUsd: body.entryPriceUsd || 0,
        exitPriceUsd: body.exitPriceUsd,
        tokenAmount: body.tokenAmount || '1000',
        positionSizeUsd: body.positionSizeUsd || 100,
        realizedPnlUsd: body.realizedPnlUsd,
        roiMultiple: body.roiMultiple,
        gasSpentUsd: body.gasSpentUsd || 0.5,
        entryReason: body.entryReason || 'High Opportunity Score Signal',
        notes: body.notes || '',
        lessonsLearned: body.lessonsLearned || '',
        tags: body.tags || ['memecoin'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (trade.status === 'CLOSED' && trade.exitPriceUsd && trade.entryPriceUsd > 0) {
        trade.roiMultiple = trade.exitPriceUsd / trade.entryPriceUsd;
        trade.realizedPnlUsd = trade.positionSizeUsd * (trade.roiMultiple - 1) - (trade.gasSpentUsd || 0);
      }

      await db.saveTrade(trade);
      res.status(201).json(trade);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/journal/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      await db.updateTrade(id, updates);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Analytics endpoint
  app.get('/api/analytics', async (_req, res) => {
    try {
      const trades = await db.listTrades();
      const closed = trades.filter((t) => t.status === 'CLOSED');
      const winning = closed.filter((t) => (t.realizedPnlUsd || 0) > 0);
      const losing = closed.filter((t) => (t.realizedPnlUsd || 0) < 0);

      const totalInvested = trades.reduce((acc, t) => acc + (t.positionSizeUsd || 0), 0);
      const totalPnl = closed.reduce((acc, t) => acc + (t.realizedPnlUsd || 0), 0);
      const winRate = closed.length > 0 ? winning.length / closed.length : 0;

      const totalGains = winning.reduce((acc, t) => acc + (t.realizedPnlUsd || 0), 0);
      const totalLosses = Math.abs(losing.reduce((acc, t) => acc + (t.realizedPnlUsd || 0), 0));
      const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 99 : 0;

      const multiples = closed.map((t) => t.roiMultiple || 1);
      const avgRoiMultiple = multiples.length > 0 ? multiples.reduce((a, b) => a + b, 0) / multiples.length : 1;

      res.json({
        metrics: {
          totalTrades: trades.length,
          openTrades: trades.filter((t) => t.status === 'OPEN').length,
          closedTrades: closed.length,
          winningTrades: winning.length,
          losingTrades: losing.length,
          winRate: Math.round(winRate * 1000) / 1000,
          totalPnlUsd: Math.round(totalPnl * 100) / 100,
          totalInvestedUsd: Math.round(totalInvested),
          profitFactor: Math.round(profitFactor * 100) / 100,
          avgRoiMultiple: Math.round(avgRoiMultiple * 100) / 100,
          bestTradeMultiple: multiples.length > 0 ? Math.max(...multiples) : 1,
          worstTradeMultiple: multiples.length > 0 ? Math.min(...multiples) : 1,
        },
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Seed / Simulation trigger for testing any chain
  app.post('/api/simulate', async (req, res) => {
    try {
      const chainId = (req.body.chainId as ChainId) || 'solana';
      const symbol = (req.body.symbol as string) || 'PEPE';
      const address = req.body.address || `sim-${Math.random().toString(36).slice(2, 12)}`;

      await tokenRadar.processEvent({
        id: `sim-pool-${Date.now()}`,
        type: 'POOL_CREATED',
        chainId,
        tokenAddress: address,
        poolAddress: `pool-${address}`,
        txHash: `0x${Math.random().toString(16).slice(2, 34)}`,
        blockNumber: 1234567,
        timestamp: Date.now(),
        dex: chainId === 'solana' ? 'Raydium' : chainId === 'bsc' ? 'PancakeSwap' : 'Uniswap v3',
        baseTokenAddress: address,
        quoteTokenAddress: 'QUOTE',
        initialLiquidityUsd: 15000,
      });

      res.json({ success: true, message: `Simulated launch on ${chainId} for ${symbol}` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return app;
}
