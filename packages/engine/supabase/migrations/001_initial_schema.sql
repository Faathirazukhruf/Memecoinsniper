-- ==============================================================================
-- PERSONAL MULTI-CHAIN MEMECOIN HUNTING ENGINE - DATABASE SCHEMA (MIGRATION 001)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Chains
CREATE TABLE IF NOT EXISTS chains (
    id VARCHAR(32) PRIMARY KEY, -- 'solana', 'bsc', 'base'
    name VARCHAR(64) NOT NULL,
    native_currency VARCHAR(16) NOT NULL,
    explorer_url TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO chains (id, name, native_currency, explorer_url, enabled)
VALUES
    ('solana', 'Solana', 'SOL', 'https://solscan.io', true),
    ('bsc', 'BNB Smart Chain', 'BNB', 'https://bscscan.com', true),
    ('base', 'Base', 'ETH', 'https://basescan.org', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Tokens
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    symbol VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 9,
    total_supply TEXT,
    deployer_address VARCHAR(128),
    initial_liquidity_usd NUMERIC(18, 4) DEFAULT 0,
    created_at_chain TIMESTAMPTZ NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_chain_token_address UNIQUE (chain_id, address)
);

CREATE INDEX IF NOT EXISTS idx_tokens_chain_created ON tokens(chain_id, created_at_chain DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_address ON tokens(address);

-- 3. Pools
CREATE TABLE IF NOT EXISTS pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    dex VARCHAR(64) NOT NULL,
    base_token_address VARCHAR(128) NOT NULL,
    quote_token_address VARCHAR(128) NOT NULL,
    quote_symbol VARCHAR(32) NOT NULL DEFAULT 'SOL',
    initial_liquidity_usd NUMERIC(18, 4) DEFAULT 0,
    current_liquidity_usd NUMERIC(18, 4) DEFAULT 0,
    lp_locked_or_burned BOOLEAN DEFAULT FALSE,
    lp_locked_percentage NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_chain_pool_address UNIQUE (chain_id, address)
);

CREATE INDEX IF NOT EXISTS idx_pools_token ON pools(chain_id, base_token_address);

-- 4. Token Market Snapshots (Periodic metrics for momentum & volume acceleration)
CREATE TABLE IF NOT EXISTS token_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    price_usd NUMERIC(24, 10) NOT NULL,
    liquidity_usd NUMERIC(18, 4) NOT NULL DEFAULT 0,
    market_cap_usd NUMERIC(18, 4) DEFAULT 0,
    volume_5m_usd NUMERIC(18, 4) DEFAULT 0,
    volume_1h_usd NUMERIC(18, 4) DEFAULT 0,
    volume_24h_usd NUMERIC(18, 4) DEFAULT 0,
    tx_count_5m INTEGER DEFAULT 0,
    buys_5m INTEGER DEFAULT 0,
    sells_5m INTEGER DEFAULT 0,
    unique_buyers_5m INTEGER DEFAULT 0,
    holders_count INTEGER DEFAULT 0,
    snapshot_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_token_time ON token_snapshots(chain_id, token_address, snapshot_time DESC);

-- 5. Security Checks
CREATE TABLE IF NOT EXISTS security_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL, -- 'PASS', 'WARN', 'FAIL', 'UNKNOWN'
    risk_score INTEGER NOT NULL DEFAULT 0,
    is_honeypot BOOLEAN,
    buy_tax_percentage NUMERIC(5, 2),
    sell_tax_percentage NUMERIC(5, 2),
    is_mintable BOOLEAN,
    is_freezable BOOLEAN,
    is_ownership_renounced BOOLEAN,
    is_lp_locked_or_burned BOOLEAN,
    lp_locked_percentage NUMERIC(5, 2),
    top10_holders_share_pct NUMERIC(5, 2),
    flags JSONB NOT NULL DEFAULT '[]',
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_chain_token_security UNIQUE (chain_id, token_address)
);

CREATE INDEX IF NOT EXISTS idx_security_status ON security_checks(status, risk_score);

-- 6. Tracked & Smart Wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    label VARCHAR(128),
    category VARCHAR(32) DEFAULT 'UNKNOWN',
    is_watchlisted BOOLEAN DEFAULT TRUE,
    smart_score INTEGER DEFAULT 0,
    notes TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_chain_wallet_address UNIQUE (chain_id, address)
);

CREATE INDEX IF NOT EXISTS idx_wallets_smart_score ON wallets(smart_score DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_watchlisted ON wallets(is_watchlisted);

-- 7. Wallet Trades History
CREATE TABLE IF NOT EXISTS wallet_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    token_address VARCHAR(128) NOT NULL,
    token_symbol VARCHAR(32),
    is_buy BOOLEAN NOT NULL,
    amount_usd NUMERIC(18, 4) NOT NULL,
    token_amount TEXT NOT NULL,
    price_usd NUMERIC(24, 10) NOT NULL,
    tx_hash VARCHAR(128) NOT NULL,
    realized_pnl_usd NUMERIC(18, 4),
    roi_multiple NUMERIC(10, 2),
    hold_duration_seconds INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_trades ON wallet_trades(chain_id, wallet_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_trades_token ON wallet_trades(chain_id, token_address);

-- 8. Wallet Computed Metrics
CREATE TABLE IF NOT EXISTS wallet_metrics (
    wallet_address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate NUMERIC(5, 3) DEFAULT 0,
    avg_roi_multiple NUMERIC(10, 2) DEFAULT 1,
    median_roi_multiple NUMERIC(10, 2) DEFAULT 1,
    profit_factor NUMERIC(10, 2) DEFAULT 0,
    realized_pnl_usd NUMERIC(18, 4) DEFAULT 0,
    early_entry_rate NUMERIC(5, 3) DEFAULT 0,
    avg_hold_time_seconds INTEGER DEFAULT 0,
    avg_position_size_usd NUMERIC(18, 4) DEFAULT 0,
    best_trade_multiple NUMERIC(10, 2) DEFAULT 1,
    worst_trade_multiple NUMERIC(10, 2) DEFAULT 1,
    max_consecutive_losses INTEGER DEFAULT 0,
    smart_score INTEGER DEFAULT 0,
    confidence_score NUMERIC(5, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chain_id, wallet_address)
);

-- 9. Signals (Scored Opportunities)
CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    token_symbol VARCHAR(32) NOT NULL,
    token_name VARCHAR(128) NOT NULL,
    dex VARCHAR(64) NOT NULL,
    mode VARCHAR(32) NOT NULL, -- 'NEW_LAUNCH', 'SMART_MONEY', 'MOMENTUM'
    total_score INTEGER NOT NULL,
    score_breakdown JSONB NOT NULL,
    security_report JSONB NOT NULL,
    smart_wallets_count INTEGER DEFAULT 0,
    smart_wallet_addresses JSONB DEFAULT '[]',
    trigger_reason TEXT NOT NULL,
    telegram_alert_sent BOOLEAN DEFAULT FALSE,
    telegram_message_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_score ON signals(total_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_token ON signals(chain_id, token_address);

-- 10. Operator Trade Journal
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    token_symbol VARCHAR(32) NOT NULL,
    token_name VARCHAR(128) NOT NULL,
    dex VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED', 'CANCELLED'
    signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
    signal_type VARCHAR(32),
    opportunity_score_at_entry INTEGER,
    entry_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_timestamp TIMESTAMPTZ,
    entry_price_usd NUMERIC(24, 10) NOT NULL,
    exit_price_usd NUMERIC(24, 10),
    token_amount TEXT NOT NULL,
    position_size_usd NUMERIC(18, 4) NOT NULL,
    realized_pnl_usd NUMERIC(18, 4),
    roi_multiple NUMERIC(10, 2),
    gas_spent_usd NUMERIC(10, 4) DEFAULT 0,
    entry_tx_hash VARCHAR(128),
    exit_tx_hash VARCHAR(128),
    entry_reason TEXT,
    exit_reason TEXT,
    notes TEXT,
    lessons_learned TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status, entry_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_chain ON trades(chain_id, entry_timestamp DESC);

-- 11. Alert Deduplication Logs
CREATE TABLE IF NOT EXISTS alert_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id VARCHAR(32) REFERENCES chains(id) ON DELETE CASCADE,
    token_address VARCHAR(128) NOT NULL,
    alert_type VARCHAR(32) NOT NULL,
    score INTEGER NOT NULL,
    dispatched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_logs_dedup ON alert_logs(chain_id, token_address, dispatched_at DESC);
