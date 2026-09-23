import { ChainId } from '../types/chain';
import { SecurityFlag, SecurityReport, SecurityStatus } from '../types/security';

export interface RawSecurityCheckData {
  tokenAddress: string;
  chainId: ChainId;
  isHoneypot?: boolean | null;
  buyTaxPercentage?: number | null;
  sellTaxPercentage?: number | null;
  isMintable?: boolean | null;
  isFreezable?: boolean | null;
  isOwnershipRenounced?: boolean | null;
  isLpLockedOrBurned?: boolean | null;
  lpLockedPercentage?: number | null;
  top10HoldersSharePercentage?: number | null;
  deployerHoldingPercentage?: number | null;
  hasBlacklist?: boolean | null;
}

/**
 * Evaluates security inputs against deterministic risk rules
 * Outputs a structured SecurityReport with PASS / WARN / FAIL / UNKNOWN and risk flags.
 */
export function evaluateSecurity(data: RawSecurityCheckData): SecurityReport {
  const flags: SecurityFlag[] = [];
  let riskScore = 0;

  // 1. Honeypot check
  if (data.isHoneypot === true) {
    riskScore += 100;
    flags.push({
      code: 'HONEYPOT_DETECTED',
      name: 'Honeypot Behavior',
      severity: 'CRITICAL',
      description: 'Token cannot be sold or simulation failed on sell transaction.',
      passed: false,
    });
  } else if (data.isHoneypot === false) {
    flags.push({
      code: 'HONEYPOT_PASSED',
      name: 'Honeypot Check',
      severity: 'LOW',
      description: 'Sell simulation executed successfully.',
      passed: true,
    });
  } else {
    flags.push({
      code: 'HONEYPOT_UNKNOWN',
      name: 'Honeypot Check',
      severity: 'MEDIUM',
      description: 'Could not reliably simulate sell transfer.',
      passed: false,
    });
  }

  // 2. Taxes
  const buyTax = data.buyTaxPercentage ?? 0;
  const sellTax = data.sellTaxPercentage ?? 0;
  if (buyTax > 25 || sellTax > 25) {
    riskScore += 80;
    flags.push({
      code: 'EXTREME_TAX',
      name: 'High Tax (>25%)',
      severity: 'CRITICAL',
      description: `Buy Tax: ${buyTax}%, Sell Tax: ${sellTax}%`,
      passed: false,
    });
  } else if (buyTax > 10 || sellTax > 10) {
    riskScore += 35;
    flags.push({
      code: 'MODERATE_TAX',
      name: 'Moderate Tax (>10%)',
      severity: 'HIGH',
      description: `Buy Tax: ${buyTax}%, Sell Tax: ${sellTax}%`,
      passed: false,
    });
  } else if (Number.isFinite(data.buyTaxPercentage) && Number.isFinite(data.sellTaxPercentage)) {
    flags.push({
      code: 'TAX_ACCEPTABLE',
      name: 'Tax Rates Acceptable',
      severity: 'LOW',
      description: `Buy Tax: ${buyTax}%, Sell Tax: ${sellTax}%`,
      passed: true,
    });
  }

  // 3. Mint Authority
  if (data.isMintable === true) {
    riskScore += 30;
    flags.push({
      code: 'MINT_ACTIVE',
      name: 'Mint Authority Active',
      severity: 'HIGH',
      description: 'Creator can mint additional tokens, causing supply dilution.',
      passed: false,
    });
  } else if (data.isMintable === false) {
    flags.push({
      code: 'MINT_REVOKED',
      name: 'Mint Authority Revoked',
      severity: 'LOW',
      description: 'Supply is capped; mint function is permanently disabled.',
      passed: true,
    });
  }

  // 4. Freeze / Blacklist Authority
  if (data.isFreezable === true || data.hasBlacklist === true) {
    riskScore += 30;
    flags.push({
      code: 'FREEZE_ACTIVE',
      name: 'Freeze/Blacklist Authority Active',
      severity: 'HIGH',
      description: 'Creator can freeze token accounts or blacklist wallets from transferring.',
      passed: false,
    });
  } else if (data.isFreezable === false) {
    flags.push({
      code: 'FREEZE_REVOKED',
      name: 'Freeze Authority Revoked',
      severity: 'LOW',
      description: 'No freeze authority exists on this token.',
      passed: true,
    });
  }

  // 5. Liquidity Lock / Burn
  if (data.isLpLockedOrBurned === false) {
    riskScore += 25;
    flags.push({
      code: 'LP_UNLOCKED',
      name: 'LP Tokens Unlocked',
      severity: 'HIGH',
      description: 'Liquidity is not burned or time-locked; rug-pull risk exists.',
      passed: false,
    });
  } else if (data.isLpLockedOrBurned === true) {
    const pct = data.lpLockedPercentage;
    flags.push({
      code: 'LP_LOCKED',
      name: 'LP Burned / Locked',
      severity: 'LOW',
      description: pct == null ? 'LP lock reported; percentage unverified.' : `${pct}% of LP tokens reported locked/burned.`,
      passed: true,
    });
  }

  // 6. Top 10 Holder Concentration
  const top10 = data.top10HoldersSharePercentage ?? 0;
  if (top10 > 50) {
    riskScore += 25;
    flags.push({
      code: 'HOLDER_CONCENTRATION',
      name: 'High Top 10 Concentration',
      severity: 'MEDIUM',
      description: `Top 10 holders control ${top10.toFixed(1)}% of circulating supply.`,
      passed: false,
    });
  }

  riskScore = Math.min(100, Math.max(0, riskScore));
  let status: SecurityStatus = 'PASS';
  if (data.isHoneypot === true || buyTax > 25 || sellTax > 25 || riskScore >= 75) {
    status = 'FAIL';
  } else if (riskScore >= 35 || data.isMintable === true || data.isFreezable === true || data.hasBlacklist === true || data.isLpLockedOrBurned === false) {
    status = 'WARN';
  } else if (
    data.isHoneypot == null ||
    data.isMintable == null ||
    data.isFreezable == null ||
    data.isLpLockedOrBurned == null ||
    !Number.isFinite(data.lpLockedPercentage) ||
    !Number.isFinite(data.buyTaxPercentage) ||
    !Number.isFinite(data.sellTaxPercentage)
  ) {
    status = 'UNKNOWN';
  } else {
    status = 'PASS';
  }

  return {
    tokenAddress: data.tokenAddress,
    chainId: data.chainId,
    status,
    riskScore,
    isHoneypot: data.isHoneypot ?? null,
    buyTaxPercentage: data.buyTaxPercentage ?? null,
    sellTaxPercentage: data.sellTaxPercentage ?? null,
    isMintable: data.isMintable ?? null,
    isFreezable: data.isFreezable ?? null,
    isOwnershipRenounced: data.isOwnershipRenounced ?? null,
    isLpLockedOrBurned: data.isLpLockedOrBurned ?? null,
    lpLockedPercentage: data.lpLockedPercentage ?? null,
    top10HoldersSharePercentage: data.top10HoldersSharePercentage ?? null,
    deployerHoldingPercentage: data.deployerHoldingPercentage ?? null,
    hasBlacklist: data.hasBlacklist ?? null,
    flags,
    checkedAt: Date.now(),
  };
}
