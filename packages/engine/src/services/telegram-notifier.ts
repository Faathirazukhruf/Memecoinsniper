import { Signal, SUPPORTED_CHAINS } from '@memesniper/shared';
import fetch from 'node-fetch';
import { config } from '../config/env.js';
import { db } from '../db/supabase.js';

export class TelegramNotifier {
  private botToken?: string;
  private chatId?: string;
  private enabled: boolean;
  private minScore: number;

  constructor() {
    this.botToken = config.telegram.botToken;
    this.chatId = config.telegram.chatId;
    this.enabled = config.telegram.enabled && !!this.botToken && !!this.chatId;
    this.minScore = config.telegram.minScore;

    if (this.enabled) {
      console.log(`[Telegram Notifier] Active (Min Score: ${this.minScore}, Chat: ${this.chatId})`);
    } else {
      console.log(`[Telegram Notifier] Inactive (Provide TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to enable)`);
    }
  }

  public async sendSignalAlert(signal: Signal): Promise<boolean> {
    if (signal.opportunityScore.totalScore < this.minScore) {
      return false;
    }

    // Check deduplication window
    const alreadyAlerted = await db.hasRecentAlert(
      signal.chainId,
      signal.tokenAddress,
      config.thresholds.alertDeduplicationWindowMinutes
    );
    if (alreadyAlerted) {
      return false;
    }

    // Log alert to DB to prevent duplicate alerts
    await db.logAlert(signal.chainId, signal.tokenAddress, signal.opportunityScore.totalScore);

    const message = this.formatAlertMessage(signal);

    if (!this.enabled) {
      console.log(`\n--- [MOCK TELEGRAM ALERT] ---\n${message}\n-----------------------------\n`);
      return true;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      const data = (await res.json()) as any;
      if (data.ok) {
        signal.telegramAlertSent = true;
        signal.telegramMessageId = data.result?.message_id;
        console.log(`[Telegram Notifier] Alert sent for $${signal.tokenSymbol} (Score: ${signal.opportunityScore.totalScore})`);
        return true;
      } else {
        console.warn(`[Telegram Notifier] API Error:`, data.description);
        return false;
      }
    } catch (err) {
      console.error(`[Telegram Notifier] Network error:`, (err as Error).message);
      return false;
    }
  }

  private formatAlertMessage(signal: Signal): string {
    const chainConfig = SUPPORTED_CHAINS[signal.chainId];
    const score = signal.opportunityScore.totalScore;
    const bd = signal.opportunityScore.breakdown;
    const market = signal.token.market;
    const ageMins = Math.round(Math.max(0, (Date.now() - signal.token.createdAt) / 60000));

    const dexUrl = chainConfig.dexSwapUrlTemplate.replace('{address}', signal.tokenAddress);
    const chartUrl = `https://dexscreener.com/${chainConfig.dexScreenerPrefix}/${signal.tokenAddress}`;

    const priorityBadge = score >= 85 ? '🚨 <b>HIGH PRIORITY SIGNAL</b>' : '⚡ <b>NEW OPPORTUNITY</b>';

    return `
${priorityBadge}

<b>$${signal.tokenSymbol}</b> — ${signal.tokenName}
<b>Chain:</b> ${chainConfig.name} (${signal.dex})
<b>Mode:</b> #${signal.mode}

📊 <b>Score:</b> <b>${score}/100</b>
• Liquidity: ${bd.liquidity.score}/${bd.liquidity.max} (${bd.liquidity.reasoning})
• Momentum: ${bd.momentum.score}/${bd.momentum.max} (${bd.momentum.reasoning})
• Smart Money: ${bd.smartWallet.score}/${bd.smartWallet.max} (${bd.smartWallet.reasoning})
• Security: ${bd.security.score}/${bd.security.max} (${bd.security.reasoning})
• Holder Flow: ${bd.holderGrowth.score}/${bd.holderGrowth.max}
• Buy Pressure: ${bd.volumePressure.score}/${bd.volumePressure.max}

📈 <b>Market Snapshot:</b>
• Age: ${ageMins} mins
• Liquidity: $${Math.round(market?.liquidityUsd || 0).toLocaleString()}
• 5m Vol: $${Math.round(market?.volume5mUsd || 0).toLocaleString()} (Accel: ${market?.volumeAcceleration || 1.0}x)
• Security: <b>${signal.security.status}</b> (Risk: ${signal.security.riskScore}/100)
• Smart Wallets: <b>${signal.smartWalletsCount}</b>

📝 <b>Trigger:</b> <i>${signal.triggerReason}</i>

<b>Contract Address:</b>
<code>${signal.tokenAddress}</code>

🔗 <a href="${chartUrl}">DexScreener Chart</a> | <a href="${dexUrl}">Manual Swap</a>
`.trim();
  }
}
