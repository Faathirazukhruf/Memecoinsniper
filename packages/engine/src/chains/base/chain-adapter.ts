import {
  ChainId,
  NormalizedEvent,
  PoolMetadata,
  SecurityReport,
  TokenEntity,
} from '@memesniper/shared';
import { EventEmitter } from 'events';

export type EventCallback = (event: NormalizedEvent) => void | Promise<void>;

export interface ChainAdapterStats {
  chainId: ChainId;
  isConnected: boolean;
  eventsProcessed: number;
  lastEventTimestamp: number;
  reconnectAttempts: number;
  avgLatencyMs: number;
}

export abstract class BaseChainAdapter extends EventEmitter {
  public abstract readonly chainId: ChainId;
  protected isRunning = false;
  protected isConnected = false;
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 50;
  protected reconnectDelayMs = 3000;
  protected processedTxHashes = new Set<string>();
  protected maxCacheSize = 5000;
  protected eventsProcessed = 0;
  protected totalLatencyMs = 0;
  protected lastEventTimestamp = 0;

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract getTokenInfo(address: string): Promise<TokenEntity | null>;
  abstract getPoolInfo(poolAddress: string): Promise<PoolMetadata | null>;
  abstract checkSecurity(tokenAddress: string): Promise<SecurityReport>;

  public getStats(): ChainAdapterStats {
    return {
      chainId: this.chainId,
      isConnected: this.isConnected,
      eventsProcessed: this.eventsProcessed,
      lastEventTimestamp: this.lastEventTimestamp,
      reconnectAttempts: this.reconnectAttempts,
      avgLatencyMs:
        this.eventsProcessed > 0
          ? Math.round(this.totalLatencyMs / this.eventsProcessed)
          : 0,
    };
  }

  protected deduplicateTx(txHash: string): boolean {
    if (this.processedTxHashes.has(txHash)) {
      return true; // Already processed
    }
    this.processedTxHashes.add(txHash);
    if (this.processedTxHashes.size > this.maxCacheSize) {
      const first = this.processedTxHashes.values().next().value;
      if (first) this.processedTxHashes.delete(first);
    }
    return false;
  }

  protected emitNormalized(event: NormalizedEvent): void {
    const now = Date.now();
    const eventTime = event.timestamp || now;
    const latency = Math.max(0, now - eventTime);

    event.latencyMetrics = {
      eventTimestamp: eventTime,
      detectedTimestamp: now,
    };

    this.eventsProcessed++;
    this.totalLatencyMs += latency;
    this.lastEventTimestamp = now;

    this.emit('event', event);
  }

  protected handleConnectionError(err: Error, retryFn: () => void): void {
    this.isConnected = false;
    this.reconnectAttempts++;
    console.error(`[${this.chainId.toUpperCase()} Adapter] Connection error:`, err.message);

    if (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
      const backoff = Math.min(
        30000,
        this.reconnectDelayMs * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 1000
      );
      console.log(
        `[${this.chainId.toUpperCase()} Adapter] Reconnecting in ${(backoff / 1000).toFixed(1)}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        if (this.isRunning) retryFn();
      }, backoff);
    }
  }
}
