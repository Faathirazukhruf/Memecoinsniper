import {
  calculateOpportunityScore,
  ChainId,
  OpportunityScore,
  SecurityReport,
  TokenMarketMetrics,
} from '@memesniper/shared';
import { MarketService } from './market-service.js';
import { SecurityService } from './security-service.js';

export class ScoringService {
  private marketService: MarketService;
  private securityService: SecurityService;

  constructor(marketService: MarketService, securityService: SecurityService) {
    this.marketService = marketService;
    this.securityService = securityService;
  }

  public async scoreToken(
    chainId: ChainId,
    tokenAddress: string,
    tokenCreatedAt: number,
    smartWallets: { count: number; avgScore: number } = { count: 0, avgScore: 0 }
  ): Promise<{ score: OpportunityScore; security: SecurityReport; market: TokenMarketMetrics }> {
    const market = this.marketService.getMetrics(chainId, tokenAddress);
    const security = await this.securityService.evaluateToken(chainId, tokenAddress);

    const score = calculateOpportunityScore({
      tokenCreatedAt,
      market,
      security,
      smartWalletsCount: smartWallets.count,
      smartWalletAvgScore: smartWallets.avgScore,
    });

    return { score, security, market };
  }
}
