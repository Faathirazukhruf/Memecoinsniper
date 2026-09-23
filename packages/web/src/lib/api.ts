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
      status: 'offline',
      chains: [
        { chainId: 'solana', name: 'Solana', isConnected: false, eventsProcessed: 0 },
        { chainId: 'bsc', name: 'BNB Smart Chain', isConnected: false, eventsProcessed: 0 },
        { chainId: 'base', name: 'Base', isConnected: false, eventsProcessed: 0 },
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
    console.warn('[API Client] Signals unavailable:', (err as Error).message);
    return [];
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
    return [];
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
): Promise<{ wallet: WalletProfile | null; metrics: WalletMetrics | null; trades: WalletTrade[] }> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/wallets/${chainId}/${address}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch {
    throw new Error('Wallet data unavailable');
  }
}

export async function fetchJournal(): Promise<JournalTrade[]> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/journal`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Journal unavailable');
    const data = await res.json();
    return data.trades || [];
  } catch {
    throw new Error('Journal unavailable');
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
    throw new Error('Analytics unavailable');
  }
}

export async function triggerSimulation(chainId: ChainId, symbol: string): Promise<void> {
  const res = await fetch(`${ENGINE_URL}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainId, symbol }),
  });
  if (!res.ok) throw new Error('Simulation unavailable: engine must be in demo mode');
}
