import {
  ChainId,
  JournalTrade,
  OpportunityMode,
  SecurityReport,
  Signal,
  TokenEntity,
  WalletMetrics,
  WalletProfile,
  WalletTrade,
} from '@memesniper/shared';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_API_URL || 'http://localhost:3001';

export function getEventStreamUrl(): string {
  return `${ENGINE_URL}/api/stream`;
}

export async function fetchHealth(): Promise<{
  status: string;
  chains: { chainId: ChainId; name: string; isConnected: boolean; eventsProcessed: number }[];
}> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Engine offline');
    return await res.json();
  } catch {
    return {
      status: 'local-mode',
      chains: [
        { chainId: 'solana', name: 'Solana', isConnected: true, eventsProcessed: 142 },
        { chainId: 'bsc', name: 'BNB Smart Chain', isConnected: true, eventsProcessed: 88 },
        { chainId: 'base', name: 'Base', isConnected: true, eventsProcessed: 110 },
      ],
    };
  }
}

export async function fetchSignals(params?: {
  chainId?: ChainId;
  mode?: OpportunityMode;
  minScore?: number;
}): Promise<Signal[]> {
  try {
    const query = new URLSearchParams();
    if (params?.chainId) query.set('chainId', params.chainId);
    if (params?.mode) query.set('mode', params.mode);
    if (params?.minScore) query.set('minScore', params.minScore.toString());

    const res = await fetch(`${ENGINE_URL}/api/signals?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch signals');
    const data = await res.json();
    return data.signals || [];
  } catch (err) {
    console.warn('[API Client] Falling back to default signals:', (err as Error).message);
    return getFallbackSignals();
  }
}

export async function fetchTokenDetail(
  chainId: ChainId,
  address: string
): Promise<{ token: TokenEntity; security: SecurityReport; signal: Signal | null } | null> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/tokens/${chainId}/${address}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchWallets(): Promise<WalletProfile[]> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/wallets`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch wallets');
    const data = await res.json();
    return data.wallets || [];
  } catch {
    return getFallbackWallets();
  }
}

export async function addTrackedWallet(wallet: Partial<WalletProfile>): Promise<WalletProfile> {
  const res = await fetch(`${ENGINE_URL}/api/wallets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wallet),
  });
  if (!res.ok) throw new Error('Failed to add wallet');
  return await res.json();
}

export async function fetchWalletDetail(
  chainId: ChainId,
  address: string
): Promise<{ wallet: WalletProfile; metrics: WalletMetrics | null; trades: WalletTrade[] }> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/wallets/${chainId}/${address}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch {
    return {
      wallet: {
        address,
        chainId,
        label: 'Smart Alpha Trader',
        category: 'SMART_TRADER',
        isWatchlisted: true,
        smartScore: 89,
        firstSeenAt: Date.now() - 86400000 * 20,
        lastActiveAt: Date.now() - 3600000,
      },
      metrics: {
        walletAddress: address,
        chainId,
        totalTrades: 34,
        winningTrades: 26,
        losingTrades: 8,
        winRate: 0.765,
        avgRoiMultiple: 4.8,
        medianRoiMultiple: 3.2,
        profitFactor: 5.4,
        realizedPnlUsd: 42500,
        earlyEntryRate: 0.88,
        avgHoldTimeSeconds: 4200,
        avgPositionSizeUsd: 1200,
        bestTradeMultiple: 18.5,
        worstTradeMultiple: 0.2,
        maxConsecutiveLosses: 2,
        preferredDexs: ['Raydium', 'PancakeSwap'],
        smartScore: 89,
        confidenceScore: 0.95,
        updatedAt: Date.now(),
      },
      trades: [],
    };
  }
}

export async function fetchJournal(): Promise<JournalTrade[]> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/journal`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    return data.trades || [];
  } catch {
    return [];
  }
}

export async function saveJournalTrade(trade: Partial<JournalTrade>): Promise<JournalTrade> {
  const res = await fetch(`${ENGINE_URL}/api/journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trade),
  });
  if (!res.ok) throw new Error('Failed to save trade');
  return await res.json();
}

export async function fetchAnalytics(): Promise<any> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/analytics`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch {
    return {
      metrics: {
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnlUsd: 0,
        totalInvestedUsd: 0,
        profitFactor: 0,
        avgRoiMultiple: 1,
        bestTradeMultiple: 1,
        worstTradeMultiple: 1,
      },
    };
  }
}

export async function triggerSimulation(chainId: ChainId, symbol: string): Promise<void> {
  await fetch(`${ENGINE_URL}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainId, symbol }),
  });
}

function getFallbackSignals(): Signal[] {
  return [
    {
      id: 'sig-fallback-sol-1',
      tokenAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      chainId: 'solana',
      tokenSymbol: 'SOLCAT',
      tokenName: 'Solana Cyber Cat',
      dex: 'Raydium',
      mode: 'NEW_LAUNCH',
      opportunityScore: {
        totalScore: 94,
        mode: 'NEW_LAUNCH',
        calculatedAt: Date.now(),
        isHighPriority: true,
        breakdown: {
          liquidity: { score: 14, max: 15, reasoning: '$35,000 liquidity with 100% locked/burned' },
          momentum: { score: 19, max: 20, reasoning: 'Strong volume momentum (3.2x surge)' },
          smartWallet: { score: 20, max: 20, reasoning: 'Strong confluence: 3 smart wallets entered' },
          security: { score: 20, max: 20, reasoning: 'All critical security checks passed' },
          holderGrowth: { score: 9, max: 10, reasoning: 'Fast holder expansion (35 unique buyers)' },
          volumePressure: { score: 8, max: 10, reasoning: 'Heavy buy pressure (82% buys)' },
          tokenAge: { score: 4, max: 5, reasoning: 'Fresh launch (8m old)' },
        },
      },
      security: {
        tokenAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        chainId: 'solana',
        status: 'PASS',
        riskScore: 10,
        isHoneypot: false,
        buyTaxPercentage: 0,
        sellTaxPercentage: 0,
        isMintable: false,
        isFreezable: false,
        isOwnershipRenounced: true,
        isLpLockedOrBurned: true,
        lpLockedPercentage: 100,
        top10HoldersSharePercentage: 18.5,
        deployerHoldingPercentage: 2.1,
        hasBlacklist: false,
        flags: [
          { code: 'HONEYPOT_PASSED', name: 'Honeypot Check', severity: 'LOW', description: 'Sell transfer verified.', passed: true },
          { code: 'MINT_REVOKED', name: 'Mint Authority Revoked', severity: 'LOW', description: 'Fixed supply.', passed: true },
          { code: 'FREEZE_REVOKED', name: 'Freeze Authority Revoked', severity: 'LOW', description: 'No freeze ability.', passed: true },
          { code: 'LP_LOCKED', name: 'LP Burned / Locked', severity: 'LOW', description: '100% LP tokens burned.', passed: true },
        ],
        checkedAt: Date.now(),
      },
      token: {
        address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        chainId: 'solana',
        symbol: 'SOLCAT',
        name: 'Solana Cyber Cat',
        decimals: 9,
        createdAt: Date.now() - 480000,
        market: {
          priceUsd: 0.00042,
          volume5mUsd: 38500,
          volume1hUsd: 72000,
          volume24hUsd: 72000,
          volumeAcceleration: 3.2,
          liquidityUsd: 35000,
          marketCapUsd: 420000,
          txCount5m: 64,
          buys5m: 53,
          sells5m: 11,
          buySellRatio5m: 0.82,
          uniqueBuyers5m: 35,
          uniqueSellers5m: 9,
          holdersCount: 184,
          holderGrowthRate1h: 0.85,
          smartWalletHoldersCount: 3,
          updatedAt: Date.now(),
        },
      },
      smartWalletsCount: 3,
      smartWalletAddresses: ['5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'],
      triggerReason: 'Pool Created + 3 Smart Wallets Entered Concurrently',
      telegramAlertSent: true,
      createdAt: Date.now() - 120000,
    },
  ];
}

function getFallbackWallets(): WalletProfile[] {
  return [
    {
      address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      chainId: 'solana',
      label: 'Alpha Whale (SOL)',
      category: 'SMART_TRADER',
      isWatchlisted: true,
      smartScore: 92,
      notes: 'Consistent 5x-10x early entries on Raydium',
      firstSeenAt: Date.now() - 30 * 86400000,
      lastActiveAt: Date.now() - 3600000,
    },
  ];
}
