export type ChainId = 'solana' | 'bsc' | 'base';

export interface ChainConfig {
  id: ChainId;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  wsUrl?: string;
  explorerUrl: string;
  dexScreenerPrefix: string;
  defaultDex: string;
  dexSwapUrlTemplate: string;
  enabled: boolean;
}

export interface BlockHeaderInfo {
  chainId: ChainId;
  blockNumber: number;
  blockHash?: string;
  timestamp: number;
}
