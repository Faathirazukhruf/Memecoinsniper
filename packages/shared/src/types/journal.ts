import { ChainId } from './chain';
import { OpportunityMode } from './scoring';

export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface JournalTrade {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chainId: ChainId;
  dex: string;
  status: TradeStatus;
  signalId?: string;
  signalType?: OpportunityMode;
  opportunityScoreAtEntry?: number;
  entryTimestamp: number;
  exitTimestamp?: number;
  entryPriceUsd: number;
  exitPriceUsd?: number;
  tokenAmount: string;
  positionSizeUsd: number;
  realizedPnlUsd?: number;
  roiMultiple?: number;
  gasSpentUsd?: number;
  entryTxHash?: string;
  exitTxHash?: string;
  entryReason?: string;
  exitReason?: string;
  notes?: string;
  lessonsLearned?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}
