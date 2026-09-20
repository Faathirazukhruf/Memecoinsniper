import { ChainId } from '@memesniper/shared';
import { BaseChainAdapter } from './chains/base/chain-adapter.js';
import { SolanaAdapter } from './chains/solana/solana-adapter.js';
import { BscAdapter } from './chains/bsc/bsc-adapter.js';
import { BaseAdapter } from './chains/base/base-adapter.js';
import { config } from './config/env.js';
import { MarketService } from './services/market-service.js';
import { SecurityService } from './services/security-service.js';
import { ScoringService } from './services/scoring-service.js';
import { TelegramNotifier } from './services/telegram-notifier.js';
import { TokenRadar } from './radars/token-radar.js';
import { WalletRadar } from './radars/wallet-radar.js';
import { createServer } from './server.js';

async function bootstrap() {
  console.log('================================================================');
  console.log('🚀 PERSONAL MULTI-CHAIN MEMECOIN HUNTING ENGINE (MEMECOINSNIPER)');
  console.log('================================================================');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Min Opportunity Score Threshold: ${config.thresholds.minOpportunityScore}`);

  // 1. Initialize Chain Adapters
  const adapters = new Map<ChainId, BaseChainAdapter>();

  if (config.chains.solana.enabled) {
    const solana = new SolanaAdapter(config.chains.solana.rpcUrl, config.chains.solana.wsUrl);
    adapters.set('solana', solana);
  }

  if (config.chains.bsc.enabled) {
    const bsc = new BscAdapter(config.chains.bsc.rpcUrl, config.chains.bsc.wsUrl);
    adapters.set('bsc', bsc);
  }

  if (config.chains.base.enabled) {
    const base = new BaseAdapter(config.chains.base.rpcUrl, config.chains.base.wsUrl);
    adapters.set('base', base);
  }

  // 2. Initialize Core Services & Radars
  const marketService = new MarketService();
  const securityService = new SecurityService(adapters);
  const scoringService = new ScoringService(marketService, securityService);
  const telegramNotifier = new TelegramNotifier();
  const walletRadar = new WalletRadar();
  const tokenRadar = new TokenRadar(marketService, scoringService, telegramNotifier, walletRadar);

  // 3. Bind Chain Adapter Events to Radars
  for (const [chainId, adapter] of adapters.entries()) {
    adapter.on('event', async (event) => {
      try {
        if (event.type.startsWith('WALLET_')) {
          await walletRadar.processWalletActivity(event as any);
        } else {
          await tokenRadar.processEvent(event);
        }
      } catch (err) {
        console.error(`[Engine] Error processing event from ${chainId}:`, (err as Error).message);
      }
    });

    // Start adapter asynchronously
    adapter.start().catch((err) => {
      console.warn(`[Engine] Chain adapter ${chainId} start warning:`, err.message);
    });
  }

  // 4. Seed Initial Opportunities for immediate UI usability
  await seedInitialOpportunities(tokenRadar);

  // 5. Start API Server
  const app = createServer(adapters, tokenRadar, walletRadar);
  const server = app.listen(config.port, () => {
    console.log(`⚡ Engine API & Stream Server listening on http://localhost:${config.port}`);
    console.log(`📡 Multi-Chain Adapters Active: ${Array.from(adapters.keys()).join(', ')}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Engine] Gracefully shutting down...');
    server.close();
    for (const adapter of adapters.values()) {
      await adapter.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function seedInitialOpportunities(tokenRadar: TokenRadar) {
  const initialSeeds = [
    {
      chainId: 'solana' as ChainId,
      symbol: 'SOLCAT',
      name: 'Solana Cyber Cat',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      initialLiq: 35000,
      dex: 'Raydium',
    },
    {
      chainId: 'bsc' as ChainId,
      symbol: 'BNBDOGE',
      name: 'BNB Doge Supreme',
      address: '0x1234567890123456789012345678901234567890',
      initialLiq: 28000,
      dex: 'PancakeSwap v2',
    },
    {
      chainId: 'base' as ChainId,
      symbol: 'BASEFROG',
      name: 'Base Alpha Frog',
      address: '0x9876543210987654321098765432109876543210',
      initialLiq: 45000,
      dex: 'Uniswap v3',
    },
  ];

  for (const seed of initialSeeds) {
    await tokenRadar.processEvent({
      id: `seed-pool-${seed.symbol}`,
      type: 'POOL_CREATED',
      chainId: seed.chainId,
      tokenAddress: seed.address,
      poolAddress: `pool-${seed.address}`,
      txHash: `0x${Math.random().toString(16).slice(2, 34)}`,
      blockNumber: 100000,
      timestamp: Date.now() - 120000,
      dex: seed.dex,
      baseTokenAddress: seed.address,
      quoteTokenAddress: 'QUOTE',
      initialLiquidityUsd: seed.initialLiq,
    });
  }
}

bootstrap().catch((err) => {
  console.error('[Engine Fatal]', err);
  process.exit(1);
});
