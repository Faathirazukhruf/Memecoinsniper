import { DEFAULT_SCORE_WEIGHTS, DEFAULT_THRESHOLDS } from '../constants/defaults';
import { OpportunityMode, OpportunityScore, ScoreBreakdown, ScoreWeights } from '../types/scoring';
import { SecurityReport } from '../types/security';
import { TokenMarketMetrics } from '../types/token';

export interface ScoreInputParams {
  tokenCreatedAt: number;
  market?: Partial<TokenMarketMetrics>;
  security?: Partial<SecurityReport>;
  smartWalletsCount: number;
  smartWalletAvgScore?: number;
  mode?: OpportunityMode;
  weights?: ScoreWeights;
  currentTime?: number;
}

/**
 * Calculates a transparent deterministic 0-100 Opportunity Score.
 * Includes complete sub-scores and human-readable reasoning for each dimension.
 */
export function calculateOpportunityScore(params: ScoreInputParams): OpportunityScore {
  const weights = params.weights || DEFAULT_SCORE_WEIGHTS;
  const now = params.currentTime || Date.now();
  const ageMinutes = Math.max(0, (now - params.tokenCreatedAt) / (1000 * 60));

  const market = params.market || {};
  const security = params.security;
  const smartWalletsCount = params.smartWalletsCount || 0;
  const smartWalletAvgScore = params.smartWalletAvgScore || 0;

  // 1. Liquidity Score (max: weights.liquidity - default 15)
  const liquidityUsd = market.liquidityUsd || 0;
  let liquidityScore = 0;
  let liquidityReason = '';

  if (liquidityUsd < DEFAULT_THRESHOLDS.minLiquidityUsd) {
    liquidityScore = 0;
    liquidityReason = `Liquidity ($${liquidityUsd.toLocaleString()}) below minimum threshold ($${DEFAULT_THRESHOLDS.minLiquidityUsd.toLocaleString()})`;
  } else {
    if (liquidityUsd >= 50000) {
      liquidityScore = weights.liquidity * 0.7;
    } else if (liquidityUsd >= 10000) {
      liquidityScore = weights.liquidity * 0.6;
    } else {
      liquidityScore = weights.liquidity * 0.4;
    }

    if (security?.isLpLockedOrBurned) {
      const lockPct = security.lpLockedPercentage ?? 0;
      const lockBonus = (weights.liquidity * 0.3) * (lockPct / 100);
      liquidityScore += lockBonus;
      liquidityReason = `$${Math.round(liquidityUsd).toLocaleString()} liquidity with ${lockPct}% locked/burned`;
    } else {
      liquidityReason = `$${Math.round(liquidityUsd).toLocaleString()} liquidity (LP unverified/unlocked)`;
    }
  }
  liquidityScore = Math.min(weights.liquidity, Math.max(0, Math.round(liquidityScore * 10) / 10));

  // 2. Momentum & Volume Acceleration Score (max: weights.momentum - default 20)
  const vol5m = market.volume5mUsd || 0;
  const vol1h = market.volume1hUsd || 0;
  const acceleration = market.volumeAcceleration || (vol1h > 0 ? (vol5m * 12) / vol1h : (vol5m > 0 ? 2 : 0));
  let momentumScore = 0;
  let momentumReason = '';

  if (acceleration >= 3) {
    momentumScore = weights.momentum;
    momentumReason = `Extreme volume breakout (5m pace is ${acceleration.toFixed(1)}x 1h volume)`;
  } else if (acceleration >= 1.8) {
    momentumScore = weights.momentum * 0.8;
    momentumReason = `Strong volume momentum (${acceleration.toFixed(1)}x surge)`;
  } else if (acceleration >= 1.0) {
    momentumScore = weights.momentum * 0.5;
    momentumReason = `Steady volume pace (${acceleration.toFixed(1)}x)`;
  } else if (vol5m > 500) {
    momentumScore = weights.momentum * 0.3;
    momentumReason = `Early volume active ($${Math.round(vol5m).toLocaleString()} in 5m)`;
  } else {
    momentumScore = 0;
    momentumReason = `Low volume momentum ($${Math.round(vol5m)} 5m)`;
  }
  momentumScore = Math.min(weights.momentum, Math.max(0, Math.round(momentumScore * 10) / 10));

  // 3. Smart Wallet Confluence Score (max: weights.smartWallet - default 20)
  let smartWalletScore = 0;
  let smartWalletReason = '';

  if (smartWalletsCount >= 3) {
    smartWalletScore = weights.smartWallet;
    smartWalletReason = `Strong confluence: ${smartWalletsCount} smart wallets entered (avg score ${Math.round(smartWalletAvgScore)})`;
  } else if (smartWalletsCount === 2) {
    smartWalletScore = weights.smartWallet * 0.8;
    smartWalletReason = `Dual confirmation: 2 smart wallets bought token`;
  } else if (smartWalletsCount === 1) {
    const qualityFactor = smartWalletAvgScore >= 80 ? 0.7 : 0.5;
    smartWalletScore = weights.smartWallet * qualityFactor;
    smartWalletReason = `1 smart wallet entered (${Math.round(smartWalletAvgScore)} score)`;
  } else {
    smartWalletScore = 0;
    smartWalletReason = `No tracked smart wallet activity yet`;
  }
  smartWalletScore = Math.min(weights.smartWallet, Math.max(0, Math.round(smartWalletScore * 10) / 10));

  // 4. Security & Risk Profile Score (max: weights.security - default 20)
  let securityScore = 0;
  let securityReason = '';

  if (!security) {
    securityScore = 0;
    securityReason = 'Security scan pending / unverified';
  } else if (security.status === 'FAIL') {
    securityScore = 0;
    const failedFlags = security.flags?.filter((f) => !f.passed).map((f) => f.name).join(', ') || 'Risk detected';
    securityReason = `Security critical fail: ${failedFlags}`;
  } else if (security.status === 'WARN') {
    securityScore = weights.security * 0.5;
    const warnFlags = security.flags?.filter((f) => !f.passed).map((f) => f.name).join(', ') || 'Review carefully';
    securityReason = `Security warnings: ${warnFlags}`;
  } else if (security.status === 'PASS') {
    const isClean = security.isMintable === false && security.isFreezable === false;
    securityScore = isClean ? weights.security : weights.security * 0.85;
    securityReason = isClean ? 'All critical security checks passed (Clean contract & mint revoked)' : 'Security passed with standard checks';
  } else {
    securityScore = 0;
    securityReason = 'Unknown security properties';
  }
  securityScore = Math.min(weights.security, Math.max(0, Math.round(securityScore * 10) / 10));

  // 5. Holder Growth & Unique Buyers (max: weights.holderGrowth - default 10)
  const uniqueBuyers = market.uniqueBuyers5m || 0;
  const holders = market.holdersCount || 0;
  let holderScore = 0;
  let holderReason = '';

  if (uniqueBuyers >= 30 || (market.holderGrowthRate1h && market.holderGrowthRate1h > 0.5)) {
    holderScore = weights.holderGrowth;
    holderReason = `Fast holder expansion (${uniqueBuyers} unique buyers in 5m, ${holders} total)`;
  } else if (uniqueBuyers >= 15) {
    holderScore = weights.holderGrowth * 0.7;
    holderReason = `Healthy buyer spread (${uniqueBuyers} unique buyers in 5m)`;
  } else if (uniqueBuyers >= 5) {
    holderScore = weights.holderGrowth * 0.4;
    holderReason = `Moderate buyer activity (${uniqueBuyers} unique buyers)`;
  } else {
    holderScore = weights.holderGrowth * 0.1;
    holderReason = `Low buyer diversity (${uniqueBuyers} buyers)`;
  }
  holderScore = Math.min(weights.holderGrowth, Math.max(0, Math.round(holderScore * 10) / 10));

  // 6. Buy Pressure & Volume Imbalance (max: weights.volumePressure - default 10)
  const buys = market.buys5m || 0;
  const sells = market.sells5m || 0;
  const totalTx = buys + sells;
  let volumePressureScore = 0;
  let volumePressureReason = '';

  if (totalTx >= 5) {
    const buyRatio = buys / totalTx;
    if (buyRatio >= 0.75) {
      volumePressureScore = weights.volumePressure;
      volumePressureReason = `Heavy buy pressure (${Math.round(buyRatio * 100)}% buys, ${buys}B/${sells}S)`;
    } else if (buyRatio >= 0.55) {
      volumePressureScore = weights.volumePressure * 0.7;
      volumePressureReason = `Positive buy balance (${Math.round(buyRatio * 100)}% buys)`;
    } else if (buyRatio >= 0.40) {
      volumePressureScore = weights.volumePressure * 0.4;
      volumePressureReason = `Balanced trading (${buys}B/${sells}S)`;
    } else {
      volumePressureScore = weights.volumePressure * 0.1;
      volumePressureReason = `Sell pressure dominating (${Math.round((1 - buyRatio) * 100)}% sells)`;
    }
  } else {
    volumePressureScore = weights.volumePressure * 0.3;
    volumePressureReason = `Initial transactions recorded (${totalTx} txs in 5m)`;
  }
  volumePressureScore = Math.min(weights.volumePressure, Math.max(0, Math.round(volumePressureScore * 10) / 10));

  // 7. Token Age & Launch Timing (max: weights.tokenAge - default 5)
  let ageScore = 0;
  let ageReason = '';

  if (ageMinutes <= 15) {
    ageScore = weights.tokenAge;
    ageReason = `Fresh launch (<15 mins old: ${Math.round(ageMinutes)}m)`;
  } else if (ageMinutes <= 60) {
    ageScore = weights.tokenAge * 0.8;
    ageReason = `Early stage launch (${Math.round(ageMinutes)}m old)`;
  } else if (ageMinutes <= 360) {
    ageScore = weights.tokenAge * 0.5;
    ageReason = `Mid stage (${(ageMinutes / 60).toFixed(1)}h old)`;
  } else if (ageMinutes <= 1440) {
    ageScore = weights.tokenAge * 0.3;
    ageReason = `Established 24h token (${(ageMinutes / 60).toFixed(1)}h)`;
  } else {
    ageScore = weights.tokenAge * 0.1;
    ageReason = `Older token (${(ageMinutes / 1440).toFixed(1)} days)`;
  }
  ageScore = Math.min(weights.tokenAge, Math.max(0, Math.round(ageScore * 10) / 10));

  let mode: OpportunityMode = params.mode || 'NEW_LAUNCH';
  if (!params.mode) {
    if (smartWalletsCount >= 1 && smartWalletScore >= weights.smartWallet * 0.7) {
      mode = 'SMART_MONEY';
    } else if (momentumScore >= weights.momentum * 0.75) {
      mode = 'MOMENTUM';
    } else {
      mode = 'NEW_LAUNCH';
    }
  }

  const rawTotal = liquidityScore + momentumScore + smartWalletScore + securityScore + holderScore + volumePressureScore + ageScore;
  const totalScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

  const breakdown: ScoreBreakdown = {
    liquidity: { score: liquidityScore, max: weights.liquidity, reasoning: liquidityReason },
    momentum: { score: momentumScore, max: weights.momentum, reasoning: momentumReason },
    smartWallet: { score: smartWalletScore, max: weights.smartWallet, reasoning: smartWalletReason },
    security: { score: securityScore, max: weights.security, reasoning: securityReason },
    holderGrowth: { score: holderScore, max: weights.holderGrowth, reasoning: holderReason },
    volumePressure: { score: volumePressureScore, max: weights.volumePressure, reasoning: volumePressureReason },
    tokenAge: { score: ageScore, max: weights.tokenAge, reasoning: ageReason },
  };

  return {
    totalScore,
    mode,
    breakdown,
    calculatedAt: now,
    isHighPriority: totalScore >= DEFAULT_THRESHOLDS.highPriorityScoreThreshold && security?.status === 'PASS',
  };
}
