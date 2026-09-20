import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or engine directory
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export interface EngineConfig {
  nodeEnv: string;
  port: number;
  supabase: {
    url?: string;
    anonKey?: string;
    serviceRoleKey?: string;
  };
  telegram: {
    botToken?: string;
    chatId?: string;
    enabled: boolean;
    minScore: number;
  };
  chains: {
    solana: {
      enabled: boolean;
      rpcUrl: string;
      wsUrl?: string;
    };
    bsc: {
      enabled: boolean;
      rpcUrl: string;
      wsUrl?: string;
    };
    base: {
      enabled: boolean;
      rpcUrl: string;
      wsUrl?: string;
    };
  };
  thresholds: {
    minLiquidityUsd: number;
    maxTokenAgeMinutes: number;
    minOpportunityScore: number;
    alertDeduplicationWindowMinutes: number;
  };
}

export const config: EngineConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    enabled: process.env.TELEGRAM_ALERTS_ENABLED === 'true',
    minScore: parseInt(process.env.TELEGRAM_MIN_SCORE || '80', 10),
  },
  chains: {
    solana: {
      enabled: process.env.SOLANA_ENABLED !== 'false',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      wsUrl: process.env.SOLANA_WS_URL || 'wss://api.mainnet-beta.solana.com',
    },
    bsc: {
      enabled: process.env.BSC_ENABLED !== 'false',
      rpcUrl: process.env.BSC_RPC_URL || 'https://binance.llamarpc.com',
      wsUrl: process.env.BSC_WS_URL || 'wss://bsc-rpc.publicnode.com',
    },
    base: {
      enabled: process.env.BASE_ENABLED !== 'false',
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      wsUrl: process.env.BASE_WS_URL || 'wss://base-rpc.publicnode.com',
    },
  },
  thresholds: {
    minLiquidityUsd: parseFloat(process.env.MIN_LIQUIDITY_USD || '2000'),
    maxTokenAgeMinutes: parseInt(process.env.MAX_TOKEN_AGE_MINUTES || '1440', 10),
    minOpportunityScore: parseInt(process.env.MIN_OPPORTUNITY_SCORE || '70', 10),
    alertDeduplicationWindowMinutes: parseInt(process.env.ALERT_DEDUPLICATION_WINDOW_MINUTES || '30', 10),
  },
};
