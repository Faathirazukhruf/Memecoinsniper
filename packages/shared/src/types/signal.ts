import { ChainId } from './chain';
import { OpportunityMode, OpportunityScore } from './scoring';
import { SecurityReport } from './security';
import { TokenEntity } from './token';

export interface Signal {
  id: string;
  tokenAddress: string;
  chainId: ChainId;
  tokenSymbol: string;
  tokenName: string;
  dex: string;
  mode: OpportunityMode;
  opportunityScore: OpportunityScore;
  security: SecurityReport;
  token: TokenEntity;
  smartWalletsCount: number;
  smartWalletAddresses: string[];
  triggerReason: string;
  telegramAlertSent: boolean;
  telegramMessageId?: number;
  createdAt: number;
}
