export type OpportunityMode = 'NEW_LAUNCH' | 'SMART_MONEY' | 'MOMENTUM';

export interface ScoreWeights {
  liquidity: number;       // default 15
  momentum: number;        // default 20
  smartWallet: number;     // default 20
  security: number;        // default 20
  holderGrowth: number;    // default 10
  volumePressure: number;  // default 10
  tokenAge: number;        // default 5
}

export interface ScoreBreakdown {
  liquidity: { score: number; max: number; reasoning: string };
  momentum: { score: number; max: number; reasoning: string };
  smartWallet: { score: number; max: number; reasoning: string };
  security: { score: number; max: number; reasoning: string };
  holderGrowth: { score: number; max: number; reasoning: string };
  volumePressure: { score: number; max: number; reasoning: string };
  tokenAge: { score: number; max: number; reasoning: string };
}

export interface OpportunityScore {
  totalScore: number; // 0 - 100
  mode: OpportunityMode;
  breakdown: ScoreBreakdown;
  calculatedAt: number;
  isHighPriority: boolean;
}
