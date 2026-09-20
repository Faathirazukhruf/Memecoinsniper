import { ChainId } from './chain';

export type SecurityStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityFlag {
  code: string;
  name: string;
  severity: RiskLevel;
  description: string;
  passed: boolean;
}

export interface SecurityReport {
  tokenAddress: string;
  chainId: ChainId;
  status: SecurityStatus;
  riskScore: number;
  isHoneypot: boolean | null;
  buyTaxPercentage: number | null;
  sellTaxPercentage: number | null;
  isMintable: boolean | null;
  isFreezable: boolean | null;
  isOwnershipRenounced: boolean | null;
  isLpLockedOrBurned: boolean | null;
  lpLockedPercentage: number | null;
  top10HoldersSharePercentage: number | null;
  deployerHoldingPercentage: number | null;
  hasBlacklist: boolean | null;
  flags: SecurityFlag[];
  checkedAt: number;
}
