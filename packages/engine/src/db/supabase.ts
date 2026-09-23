import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ChainId,
  JournalTrade,
  SecurityReport,
  Signal,
  TokenEntity,
  WalletMetrics,
  WalletProfile,
  WalletTrade,
} from '@memesniper/shared';
import { config } from '../config/env.js';

export interface DatabaseAdapter {
  isCloudConnected(): boolean;
  saveToken(token: TokenEntity): Promise<void>;
  getToken(chainId: ChainId, address: string): Promise<TokenEntity | null>;
  listTokens(options?: { chainId?: ChainId; limit?: number }): Promise<TokenEntity[]>;
  saveSecurityReport(report: SecurityReport): Promise<void>;
  getSecurityReport(chainId: ChainId, address: string): Promise<SecurityReport | null>;
  saveSignal(signal: Signal): Promise<void>;
  listSignals(options?: { minScore?: number; limit?: number }): Promise<Signal[]>;
  saveWallet(wallet: WalletProfile): Promise<void>;
  listWallets(): Promise<WalletProfile[]>;
  getWallet(chainId: ChainId, address: string): Promise<WalletProfile | null>;
  saveWalletTrade(trade: WalletTrade): Promise<void>;
  listWalletTrades(walletAddress: string): Promise<WalletTrade[]>;
  saveWalletMetrics(metrics: WalletMetrics): Promise<void>;
  getWalletMetrics(chainId: ChainId, walletAddress: string): Promise<WalletMetrics | null>;
  saveTrade(trade: JournalTrade): Promise<void>;
  listTrades(): Promise<JournalTrade[]>;
  updateTrade(tradeId: string, updates: Partial<JournalTrade>): Promise<void>;
  logAlert(chainId: ChainId, tokenAddress: string, score: number): Promise<void>;
  hasRecentAlert(chainId: ChainId, tokenAddress: string, windowMinutes: number): Promise<boolean>;
}

class InMemoryDatabaseAdapter implements DatabaseAdapter {
  private tokens = new Map<string, TokenEntity>();
  private securityReports = new Map<string, SecurityReport>();
  private signals: Signal[] = [];
  private wallets = new Map<string, WalletProfile>();
  private walletTrades: WalletTrade[] = [];
  private walletMetrics = new Map<string, WalletMetrics>();
  private trades: JournalTrade[] = [];
  private alertLogs: { chainId: ChainId; tokenAddress: string; score: number; timestamp: number }[] = [];

  constructor() {
    if (config.demoMode) this.seedDefaultWallets();
  }

  isCloudConnected(): boolean {
    return false;
  }

  private seedDefaultWallets() {
    const defaultSmartWallets: WalletProfile[] = [
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
      {
        address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
        chainId: 'bsc',
        label: 'BSC Meme Scalper',
        category: 'SMART_TRADER',
        isWatchlisted: true,
        smartScore: 88,
        notes: 'High win rate on new PancakeSwap launches',
        firstSeenAt: Date.now() - 15 * 86400000,
        lastActiveAt: Date.now() - 7200000,
      },
      {
        address: '0x4200000000000000000000000000000000000006',
        chainId: 'base',
        label: 'Base Volume Hunter',
        category: 'SMART_TRADER',
        isWatchlisted: true,
        smartScore: 85,
        notes: 'Specializes in Base liquidity expansions',
        firstSeenAt: Date.now() - 10 * 86400000,
        lastActiveAt: Date.now() - 1800000,
      },
    ];

    for (const w of defaultSmartWallets) {
      this.wallets.set(`${w.chainId}:${w.address.toLowerCase()}`, w);
    }
  }

  async saveToken(token: TokenEntity): Promise<void> {
    const key = `${token.chainId}:${token.address.toLowerCase()}`;
    const existing = this.tokens.get(key);
    this.tokens.set(key, { ...existing, ...token });
  }

  async getToken(chainId: ChainId, address: string): Promise<TokenEntity | null> {
    return this.tokens.get(`${chainId}:${address.toLowerCase()}`) || null;
  }

  async listTokens(options?: { chainId?: ChainId; limit?: number }): Promise<TokenEntity[]> {
    let list = Array.from(this.tokens.values());
    if (options?.chainId) {
      list = list.filter((t) => t.chainId === options.chainId);
    }
    list.sort((a, b) => b.createdAt - a.createdAt);
    if (options?.limit) {
      list = list.slice(0, options.limit);
    }
    return list;
  }

  async saveSecurityReport(report: SecurityReport): Promise<void> {
    this.securityReports.set(`${report.chainId}:${report.tokenAddress.toLowerCase()}`, report);
  }

  async getSecurityReport(chainId: ChainId, address: string): Promise<SecurityReport | null> {
    return this.securityReports.get(`${chainId}:${address.toLowerCase()}`) || null;
  }

  async saveSignal(signal: Signal): Promise<void> {
    const index = this.signals.findIndex((s) => s.tokenAddress.toLowerCase() === signal.tokenAddress.toLowerCase() && s.chainId === signal.chainId);
    if (index >= 0) {
      this.signals[index] = signal;
    } else {
      this.signals.unshift(signal);
    }
    if (this.signals.length > 200) {
      this.signals = this.signals.slice(0, 200);
    }
  }

  async listSignals(options?: { minScore?: number; limit?: number }): Promise<Signal[]> {
    let list = [...this.signals];
    if (options?.minScore) {
      list = list.filter((s) => s.opportunityScore.totalScore >= options.minScore!);
    }
    list.sort((a, b) => b.opportunityScore.totalScore - a.opportunityScore.totalScore);
    if (options?.limit) {
      list = list.slice(0, options.limit);
    }
    return list;
  }

  async saveWallet(wallet: WalletProfile): Promise<void> {
    this.wallets.set(`${wallet.chainId}:${wallet.address.toLowerCase()}`, wallet);
  }

  async listWallets(): Promise<WalletProfile[]> {
    return Array.from(this.wallets.values());
  }

  async getWallet(chainId: ChainId, address: string): Promise<WalletProfile | null> {
    return this.wallets.get(`${chainId}:${address.toLowerCase()}`) || null;
  }

  async saveWalletTrade(trade: WalletTrade): Promise<void> {
    this.walletTrades.unshift(trade);
    if (this.walletTrades.length > 500) {
      this.walletTrades = this.walletTrades.slice(0, 500);
    }
  }

  async listWalletTrades(walletAddress: string): Promise<WalletTrade[]> {
    return this.walletTrades.filter((t) => t.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  }

  async saveWalletMetrics(metrics: WalletMetrics): Promise<void> {
    this.walletMetrics.set(`${metrics.chainId}:${metrics.walletAddress.toLowerCase()}`, metrics);
  }

  async getWalletMetrics(chainId: ChainId, walletAddress: string): Promise<WalletMetrics | null> {
    return this.walletMetrics.get(`${chainId}:${walletAddress.toLowerCase()}`) || null;
  }

  async saveTrade(trade: JournalTrade): Promise<void> {
    const idx = this.trades.findIndex((t) => t.id === trade.id);
    if (idx >= 0) {
      this.trades[idx] = trade;
    } else {
      this.trades.unshift(trade);
    }
  }

  async listTrades(): Promise<JournalTrade[]> {
    return [...this.trades];
  }

  async updateTrade(tradeId: string, updates: Partial<JournalTrade>): Promise<void> {
    const idx = this.trades.findIndex((t) => t.id === tradeId);
    if (idx >= 0) {
      this.trades[idx] = { ...this.trades[idx], ...updates, updatedAt: Date.now() };
    }
  }

  async logAlert(chainId: ChainId, tokenAddress: string, score: number): Promise<void> {
    this.alertLogs.unshift({
      chainId,
      tokenAddress: tokenAddress.toLowerCase(),
      score,
      timestamp: Date.now(),
    });
  }

  async hasRecentAlert(chainId: ChainId, tokenAddress: string, windowMinutes: number): Promise<boolean> {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    return this.alertLogs.some(
      (a) => a.chainId === chainId && a.tokenAddress === tokenAddress.toLowerCase() && a.timestamp >= cutoff
    );
  }
}

class SupabaseDatabaseAdapter implements DatabaseAdapter {
  private client: SupabaseClient;
  private fallback = new InMemoryDatabaseAdapter();

  constructor(supabaseUrl: string, serviceRoleOrAnonKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleOrAnonKey);
  }

  isCloudConnected(): boolean {
    return true;
  }

  async saveToken(token: TokenEntity): Promise<void> {
    await this.fallback.saveToken(token);
    try {
      await this.client.from('tokens').upsert(
        {
          address: token.address,
          chain_id: token.chainId,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          total_supply: token.totalSupply,
          deployer_address: token.deployerAddress,
          initial_liquidity_usd: token.pool?.initialLiquidityUsd || 0,
          created_at_chain: new Date(token.createdAt).toISOString(),
        },
        { onConflict: 'chain_id,address' }
      );
    } catch (err) {
      console.warn('[Supabase] Failed to upsert token to cloud, stored locally:', (err as Error).message);
    }
  }

  async getToken(chainId: ChainId, address: string): Promise<TokenEntity | null> {
    const local = await this.fallback.getToken(chainId, address);
    if (local) return local;
    try {
      const { data } = await this.client
        .from('tokens')
        .select('*')
        .eq('chain_id', chainId)
        .eq('address', address)
        .single();
      if (!data) return null;
      return {
        address: data.address,
        chainId: data.chain_id as ChainId,
        symbol: data.symbol,
        name: data.name,
        decimals: data.decimals,
        totalSupply: data.total_supply,
        deployerAddress: data.deployer_address,
        createdAt: new Date(data.created_at_chain).getTime(),
      };
    } catch {
      return null;
    }
  }

  async listTokens(options?: { chainId?: ChainId; limit?: number }): Promise<TokenEntity[]> {
    return this.fallback.listTokens(options);
  }

  async saveSecurityReport(report: SecurityReport): Promise<void> {
    await this.fallback.saveSecurityReport(report);
    try {
      await this.client.from('security_checks').upsert(
        {
          token_address: report.tokenAddress,
          chain_id: report.chainId,
          status: report.status,
          risk_score: report.riskScore,
          is_honeypot: report.isHoneypot,
          buy_tax_percentage: report.buyTaxPercentage,
          sell_tax_percentage: report.sellTaxPercentage,
          is_mintable: report.isMintable,
          is_freezable: report.isFreezable,
          is_ownership_renounced: report.isOwnershipRenounced,
          is_lp_locked_or_burned: report.isLpLockedOrBurned,
          lp_locked_percentage: report.lpLockedPercentage,
          top10_holders_share_pct: report.top10HoldersSharePercentage,
          flags: report.flags,
          checked_at: new Date(report.checkedAt).toISOString(),
        },
        { onConflict: 'chain_id,token_address' }
      );
    } catch (err) {
      console.warn('[Supabase] Failed to save security check to cloud:', (err as Error).message);
    }
  }

  async getSecurityReport(chainId: ChainId, address: string): Promise<SecurityReport | null> {
    return this.fallback.getSecurityReport(chainId, address);
  }

  async saveSignal(signal: Signal): Promise<void> {
    await this.fallback.saveSignal(signal);
    try {
      await this.client.from('signals').upsert({
        id: signal.id,
        token_address: signal.tokenAddress,
        chain_id: signal.chainId,
        token_symbol: signal.tokenSymbol,
        token_name: signal.tokenName,
        dex: signal.dex,
        mode: signal.mode,
        total_score: signal.opportunityScore.totalScore,
        score_breakdown: signal.opportunityScore.breakdown,
        security_report: signal.security,
        smart_wallets_count: signal.smartWalletsCount,
        smart_wallet_addresses: signal.smartWalletAddresses,
        trigger_reason: signal.triggerReason,
        telegram_alert_sent: signal.telegramAlertSent,
        telegram_message_id: signal.telegramMessageId,
        created_at: new Date(signal.createdAt).toISOString(),
      });
    } catch (err) {
      console.warn('[Supabase] Failed to save signal to cloud:', (err as Error).message);
    }
  }

  async listSignals(options?: { minScore?: number; limit?: number }): Promise<Signal[]> {
    return this.fallback.listSignals(options);
  }

  async saveWallet(wallet: WalletProfile): Promise<void> {
    await this.fallback.saveWallet(wallet);
  }

  async listWallets(): Promise<WalletProfile[]> {
    return this.fallback.listWallets();
  }

  async getWallet(chainId: ChainId, address: string): Promise<WalletProfile | null> {
    return this.fallback.getWallet(chainId, address);
  }

  async saveWalletTrade(trade: WalletTrade): Promise<void> {
    await this.fallback.saveWalletTrade(trade);
  }

  async listWalletTrades(walletAddress: string): Promise<WalletTrade[]> {
    return this.fallback.listWalletTrades(walletAddress);
  }

  async saveWalletMetrics(metrics: WalletMetrics): Promise<void> {
    await this.fallback.saveWalletMetrics(metrics);
  }

  async getWalletMetrics(chainId: ChainId, walletAddress: string): Promise<WalletMetrics | null> {
    return this.fallback.getWalletMetrics(chainId, walletAddress);
  }

  async saveTrade(trade: JournalTrade): Promise<void> {
    await this.fallback.saveTrade(trade);
    try {
      await this.client.from('trades').upsert({
        id: trade.id,
        token_address: trade.tokenAddress,
        chain_id: trade.chainId,
        token_symbol: trade.tokenSymbol,
        token_name: trade.tokenName,
        dex: trade.dex,
        status: trade.status,
        signal_id: trade.signalId || null,
        signal_type: trade.signalType || null,
        opportunity_score_at_entry: trade.opportunityScoreAtEntry || null,
        entry_timestamp: new Date(trade.entryTimestamp).toISOString(),
        exit_timestamp: trade.exitTimestamp ? new Date(trade.exitTimestamp).toISOString() : null,
        entry_price_usd: trade.entryPriceUsd,
        exit_price_usd: trade.exitPriceUsd || null,
        token_amount: trade.tokenAmount,
        position_size_usd: trade.positionSizeUsd,
        realized_pnl_usd: trade.realizedPnlUsd || null,
        roi_multiple: trade.roiMultiple || null,
        gas_spent_usd: trade.gasSpentUsd || 0,
        entry_tx_hash: trade.entryTxHash || null,
        exit_tx_hash: trade.exitTxHash || null,
        entry_reason: trade.entryReason || null,
        exit_reason: trade.exitReason || null,
        notes: trade.notes || null,
        lessons_learned: trade.lessonsLearned || null,
        tags: trade.tags || [],
      });
    } catch (err) {
      console.warn('[Supabase] Failed to persist trade to cloud:', (err as Error).message);
    }
  }

  async listTrades(): Promise<JournalTrade[]> {
    return this.fallback.listTrades();
  }

  async updateTrade(tradeId: string, updates: Partial<JournalTrade>): Promise<void> {
    await this.fallback.updateTrade(tradeId, updates);
  }

  async logAlert(chainId: ChainId, tokenAddress: string, score: number): Promise<void> {
    await this.fallback.logAlert(chainId, tokenAddress, score);
  }

  async hasRecentAlert(chainId: ChainId, tokenAddress: string, windowMinutes: number): Promise<boolean> {
    return this.fallback.hasRecentAlert(chainId, tokenAddress, windowMinutes);
  }
}

export const db: DatabaseAdapter =
  !config.demoMode && config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey)
    ? new SupabaseDatabaseAdapter(
        config.supabase.url,
        config.supabase.serviceRoleKey || config.supabase.anonKey!
      )
    : new InMemoryDatabaseAdapter();
