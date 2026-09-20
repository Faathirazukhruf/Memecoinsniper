import {
  NormalizedEvent,
  PoolCreatedEvent,
  Signal,
  SwapEvent,
  TokenCreatedEvent,
  TokenEntity,
} from '@memesniper/shared';
import { db } from '../db/supabase.js';
import { MarketService } from '../services/market-service.js';
import { ScoringService } from '../services/scoring-service.js';
import { TelegramNotifier } from '../services/telegram-notifier.js';
import { WalletRadar } from './wallet-radar.js';

export class TokenRadar {
  private marketService: MarketService;
  private scoringService: ScoringService;
  private telegramNotifier: TelegramNotifier;
  private walletRadar: WalletRadar;

  constructor(
    marketService: MarketService,
    scoringService: ScoringService,
    telegramNotifier: TelegramNotifier,
    walletRadar: WalletRadar
  ) {
    this.marketService = marketService;
    this.scoringService = scoringService;
    this.telegramNotifier = telegramNotifier;
    this.walletRadar = walletRadar;
  }

  public async processEvent(event: NormalizedEvent): Promise<void> {
    switch (event.type) {
      case 'TOKEN_CREATED':
        await this.handleTokenCreated(event as TokenCreatedEvent);
        break;
      case 'POOL_CREATED':
        await this.handlePoolCreated(event as PoolCreatedEvent);
        break;
      case 'SWAP':
      case 'FIRST_SWAP':
      case 'LARGE_SWAP':
        await this.handleSwap(event as SwapEvent);
        break;
    }
  }

  private async handleTokenCreated(event: TokenCreatedEvent): Promise<void> {
    const token: TokenEntity = {
      address: event.tokenAddress,
      chainId: event.chainId,
      symbol: event.symbol || 'MEME',
      name: event.name || 'Meme Token',
      decimals: event.decimals || 9,
      totalSupply: event.totalSupply,
      deployerAddress: event.deployerAddress,
      createdAt: event.timestamp || Date.now(),
    };

    await db.saveToken(token);
    console.log(`[Token Radar] New token detected: ${token.symbol} on ${token.chainId} (${token.address})`);
  }

  private async handlePoolCreated(event: PoolCreatedEvent): Promise<void> {
    this.marketService.registerPool(event.chainId, event.tokenAddress, event.initialLiquidityUsd || 5000);

    let token = await db.getToken(event.chainId, event.tokenAddress);
    if (!token) {
      token = {
        address: event.tokenAddress,
        chainId: event.chainId,
        symbol: event.tokenAddress.slice(0, 4).toUpperCase(),
        name: `Token ${event.tokenAddress.slice(0, 6)}`,
        decimals: 9,
        createdAt: event.timestamp || Date.now(),
      };
      await db.saveToken(token);
    }

    token.pool = {
      id: event.poolAddress || event.tokenAddress,
      address: event.poolAddress || event.tokenAddress,
      chainId: event.chainId,
      dex: event.dex || 'Raydium',
      baseTokenAddress: event.baseTokenAddress,
      quoteTokenAddress: event.quoteTokenAddress,
      quoteTokenSymbol: event.chainId === 'solana' ? 'SOL' : event.chainId === 'bsc' ? 'WBNB' : 'WETH',
      initialLiquidityUsd: event.initialLiquidityUsd || 5000,
      currentLiquidityUsd: event.initialLiquidityUsd || 5000,
      reserveBase: '100000000',
      reserveQuote: '10',
      createdAt: event.timestamp || Date.now(),
      lpBurnedOrLocked: true,
      lpLockedPercentage: 100,
    };
    await db.saveToken(token);

    // Evaluate token score
    await this.evaluateAndSignal(token, event.dex || 'DEX', 'Pool Created & Initial Liquidity Added');
  }

  private async handleSwap(event: SwapEvent): Promise<void> {
    const isSmart = this.walletRadar.isSmartWallet(event.chainId, event.traderAddress);

    this.marketService.recordSwap(
      event.chainId,
      event.tokenAddress,
      event.isBuy,
      event.amountUsd,
      event.priceUsd,
      event.traderAddress,
      isSmart
    );

    const token = await db.getToken(event.chainId, event.tokenAddress);
    if (token) {
      const triggerReason = isSmart
        ? `Smart Wallet ${event.traderAddress.slice(0, 6)}... bought $${Math.round(event.amountUsd)}`
        : event.amountUsd >= 5000
        ? `Large Buy detected ($${Math.round(event.amountUsd).toLocaleString()})`
        : 'Volume Acceleration Event';

      await this.evaluateAndSignal(token, token.pool?.dex || 'DEX', triggerReason);
    }
  }

  public async evaluateAndSignal(token: TokenEntity, dex: string, triggerReason: string): Promise<Signal | null> {
    const smartWalletsInfo = this.walletRadar.getTokenSmartWallets(token.chainId, token.address);

    const { score, security, market } = await this.scoringService.scoreToken(
      token.chainId,
      token.address,
      token.createdAt,
      smartWalletsInfo
    );

    token.market = market;
    await db.saveToken(token);

    const signal: Signal = {
      id: `sig-${token.chainId}-${token.address.slice(0, 8)}-${Date.now()}`,
      tokenAddress: token.address,
      chainId: token.chainId,
      tokenSymbol: token.symbol,
      tokenName: token.name,
      dex: dex || token.pool?.dex || 'DEX',
      mode: score.mode,
      opportunityScore: score,
      security,
      token,
      smartWalletsCount: smartWalletsInfo.count,
      smartWalletAddresses: smartWalletsInfo.addresses,
      triggerReason,
      telegramAlertSent: false,
      createdAt: Date.now(),
    };

    await db.saveSignal(signal);

    // Dispatch Telegram alert if priority threshold is passed
    if (score.isHighPriority || score.totalScore >= 75) {
      await this.telegramNotifier.sendSignalAlert(signal);
    }

    return signal;
  }
}
