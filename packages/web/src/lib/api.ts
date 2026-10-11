import {
  ChainId,
  JournalTrade,
  OpportunityMode,
  SecurityReport,
  Signal,
  TokenEntity,
  WalletDetail,
  TrackedWallet,
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

async function walletRequest<T>(route: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response=await fetch(ENGINE_URL+'/api/wallets'+route,{...options,cache:'no-store',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json'}}); }
  catch { throw new Error('Wallet service unavailable. Check the engine connection and retry.'); }
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Wallet request failed');
  return data;
}
export async function fetchWallets():Promise<TrackedWallet[]> {
  return (await walletRequest<{wallets:TrackedWallet[]}>('')).wallets;
}
export function addTrackedWallet(wallet:{address:string;chainId:ChainId;label?:string;notes?:string}):Promise<TrackedWallet> {
  return walletRequest('',{method:'POST',body:JSON.stringify(wallet)});
}
export function fetchWalletDetail(chain:ChainId,address:string):Promise<WalletDetail> {
  return walletRequest('/'+chain+'/'+encodeURIComponent(address));
}
export function syncWallet(chain:ChainId,address:string):Promise<{success:boolean}> {
  return walletRequest('/'+chain+'/'+encodeURIComponent(address)+'/sync',{method:'POST'});
}
export function pauseWallet(chain:ChainId,address:string,paused:boolean):Promise<{success:boolean}> {
  return walletRequest('/'+chain+'/'+encodeURIComponent(address),{method:'PATCH',body:JSON.stringify({paused})});
}
export function deleteWallet(chain:ChainId,address:string):Promise<{success:boolean}> {
  return walletRequest('/'+chain+'/'+encodeURIComponent(address),{method:'DELETE'});
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
