# Engine API & Real-Time Stream Reference

The **Memecoinsniper Engine** (`packages/engine`) provides a lightweight REST and Server-Sent Events (SSE) server on port `3001` (configurable via `PORT` in `.env`).

> [!NOTE]
> The engine API is designed for trusted local operator execution (`localhost`). It does not include an external authentication layer. If exposing over a public network, place it behind a reverse proxy (e.g. Nginx, Caddy) with basic auth or TLS.

---

## 1. System & Real-Time Stream

### `GET /api/health`
Returns the operational health, connected chain adapters, and database status.

- **Response `200 OK`**:
```json
{
  "status": "online",
  "mode": "live",
  "version": "1.0.0",
  "cloudDbConnected": false,
  "timestamp": 1739500000000,
  "chains": [
    {
      "chainId": "solana",
      "name": "Solana",
      "isConnected": true,
      "eventsProcessed": 1420,
      "reconnectAttempts": 0,
      "lastEventTimestamp": 1739500000000
    },
    {
      "chainId": "bsc",
      "name": "BNB Smart Chain",
      "isConnected": true,
      "eventsProcessed": 850,
      "reconnectAttempts": 0,
      "lastEventTimestamp": 1739500000000
    },
    {
      "chainId": "base",
      "name": "Base",
      "isConnected": true,
      "eventsProcessed": 640,
      "reconnectAttempts": 0,
      "lastEventTimestamp": 1739500000000
    }
  ]
}
```

---

### `GET /api/stream`
A persistent **Server-Sent Events (SSE)** endpoint broadcasting new trading signals in real-time to the Next.js cockpit.

- **Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Events Dispatched**:
  1. `CONNECTED`: Handshake event upon establishing connection.
     ```json
     data: {"type": "CONNECTED", "timestamp": 1739500000000}
     ```
  2. `SIGNAL`: Dispatched whenever a newly evaluated token meets the minimum opportunity score threshold.
     ```json
     data: {
       "type": "SIGNAL",
       "data": {
         "id": "sig-solana-7xKXtg...-1739500000000",
         "chainId": "solana",
         "tokenAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
         "mode": "NEW_LAUNCH",
         "totalScore": 88,
         "scoreBreakdown": {
           "liquidity": { "score": 13.5, "max": 15, "reasoning": "$35,000 liquidity with 100% locked/burned" },
           "momentum": { "score": 20, "max": 20, "reasoning": "Extreme volume breakout (3.4x surge)" },
           "smartWallet": { "score": 16, "max": 20, "reasoning": "Dual confirmation: 2 smart wallets bought token" },
           "security": { "score": 20, "max": 20, "reasoning": "All critical security checks passed" },
           "holderGrowth": { "score": 10, "max": 10, "reasoning": "Fast holder expansion (34 unique buyers in 5m)" },
           "volumePressure": { "score": 7, "max": 10, "reasoning": "Positive buy balance (68% buys)" },
           "tokenAge": { "score": 5, "max": 5, "reasoning": "Fresh launch (<15 mins old: 4m)" }
         },
         "isHighPriority": true,
         "createdAt": 1739500000000
       }
     }
     ```

---

## 2. Signals & Market Screener

### `GET /api/signals`
Queries discovered opportunity signals with multi-dimensional filtering.

- **Query Parameters**:
  - `minScore` *(number, optional)*: Minimum Opportunity Score (0–100, default: 0).
  - `chainId` *(string, optional)*: Filter by `'solana'`, `'bsc'`, or `'base'`.
  - `mode` *(string, optional)*: Filter by `'NEW_LAUNCH'`, `'SMART_MONEY'`, or `'MOMENTUM'`.
  - `limit` *(number, optional)*: Maximum items returned (default: 50, max: 100).

- **Response `200 OK`**:
```json
{
  "total": 1,
  "signals": [
    {
      "id": "sig-solana-...",
      "chainId": "solana",
      "tokenAddress": "...",
      "mode": "NEW_LAUNCH",
      "totalScore": 88,
      "token": {
        "symbol": "SOLCAT",
        "name": "Solana Cyber Cat",
        "decimals": 9
      },
      "security": {
        "status": "PASS",
        "riskScore": 10,
        "isMintable": false,
        "isFreezable": false
      }
    }
  ]
}
```

---

### `GET /api/tokens/:chainId/:address`
Returns complete profile, security audit, and latest opportunity score for a specific token.

- **Path Parameters**:
  - `chainId`: `'solana'`, `'bsc'`, or `'base'`.
  - `address`: Contract or mint address.

- **Response `200 OK`**:
```json
{
  "token": {
    "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "chainId": "solana",
    "symbol": "SOLCAT",
    "name": "Solana Cyber Cat",
    "decimals": 9,
    "totalSupply": "1000000000"
  },
  "security": {
    "tokenAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "chainId": "solana",
    "status": "PASS",
    "riskScore": 10,
    "isMintable": false,
    "isFreezable": false,
    "isLpLockedOrBurned": true,
    "lpLockedPercentage": 100,
    "flags": []
  },
  "signal": { ... }
}
```

---

## 3. Smart Wallet Intelligence Radar

> [!NOTE]
> All Wallet Radar operations persist directly to local atomic storage (`data/wallet-radar.json`).

### `GET /api/wallets`
Lists all tracked wallets, their sync status, and performance summaries.

- **Response `200 OK`**:
```json
{
  "wallets": [
    {
      "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "chainId": "solana",
      "label": "Top Solana Whale #1",
      "notes": "Early buyer in pump breakout cycles",
      "syncState": "READY",
      "smartScore": 82,
      "isWatchlisted": true,
      "metrics": {
        "winRate": 0.72,
        "profitFactor": 3.4,
        "measuredGrossPnlUsd": 45200.5,
        "measuredExits": 28
      }
    }
  ]
}
```

### `POST /api/wallets`
Registers a new wallet address for RPC monitoring and FIFO performance reconstruction.

- **Body**:
```json
{
  "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "chainId": "solana",
  "label": "Alpha Hunter",
  "notes": "Found via Solscan profit leaderboard"
}
```

### `GET /api/wallets/:chainId/:address`
Fetches in-depth tracking history, observed movements, current FIFO token positions, and measured trade exits.

### `POST /api/wallets/:chainId/:address/sync`
Queues an on-demand RPC catch-up sync for the specified wallet.

### `PATCH /api/wallets/:chainId/:address`
Updates wallet operational state (e.g. `{ "paused": true }` to temporarily exclude from smart confluence calculations).

### `DELETE /api/wallets/:chainId/:address`
Removes wallet from tracking and deletes its local history.

---

## 4. Operator Trade Journal & Strategy Analytics

### `GET /api/trades`
Returns the manual trading journal log.

- **Query Parameters**:
  - `status` *(string, optional)*: `'OPEN'`, `'CLOSED'`, or `'CANCELLED'`.
  - `limit` *(number, optional)*: Default 50.

### `POST /api/trades`
Logs a new manual trade entry.

- **Body**:
```json
{
  "tokenAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "tokenSymbol": "SOLCAT",
  "chainId": "solana",
  "direction": "BUY",
  "entryPriceUsd": 0.00342,
  "positionSizeUsd": 250,
  "opportunityScore": 88,
  "entryReason": "Breakout 3.4x volume with 2 smart wallets accumulating",
  "notes": "Target 2.5x exit"
}
```

### `PATCH /api/trades/:id`
Updates or closes an open trade position with exit price, realized PnL, and lessons learned.

- **Body**:
```json
{
  "exitPriceUsd": 0.0078,
  "status": "CLOSED",
  "realizedPnlUsd": 320.17,
  "roiMultiple": 2.28,
  "lessonsLearned": "Exited half at 2x and trailed stop loss properly"
}
```

### `GET /api/stats`
Computes performance statistics across all recorded journal entries:
- Total trades, win rate percentage, and average ROI multiple.
- Profit factor and total net realized PnL in USD.
- Performance split by opportunity mode (`#NEW_LAUNCH`, `#SMART_MONEY`, `#MOMENTUM`).
