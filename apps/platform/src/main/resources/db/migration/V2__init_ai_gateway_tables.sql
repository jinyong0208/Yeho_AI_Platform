CREATE TABLE IF NOT EXISTS ai_provider (
    id BIGINT PRIMARY KEY,
    provider_code VARCHAR(64) NOT NULL UNIQUE,
    provider_name VARCHAR(128) NOT NULL,
    base_url VARCHAR(512) NOT NULL,
    api_key_encrypted TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_model (
    id BIGINT PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES ai_provider(id),
    model_code VARCHAR(128) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    input_price NUMERIC(18, 8) NOT NULL DEFAULT 0,
    output_price NUMERIC(18, 8) NOT NULL DEFAULT 0,
    input_credit_rate NUMERIC(18, 8) NOT NULL DEFAULT 0,
    output_credit_rate NUMERIC(18, 8) NOT NULL DEFAULT 0,
    billing_multiplier NUMERIC(18, 8) NOT NULL DEFAULT 1,
    support_stream BOOLEAN NOT NULL DEFAULT FALSE,
    support_tool_call BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_model_provider_id ON ai_model(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_status ON ai_model(status);

CREATE TABLE IF NOT EXISTS tenant_api_key (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id),
    api_key_hash VARCHAR(128) NOT NULL UNIQUE,
    api_key_prefix VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    expired_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_api_key_tenant_id ON tenant_api_key(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_api_key_prefix ON tenant_api_key(api_key_prefix);

CREATE TABLE IF NOT EXISTS tenant_wallet (
    tenant_id BIGINT PRIMARY KEY REFERENCES tenant(id),
    balance_credits BIGINT NOT NULL DEFAULT 0,
    frozen_credits BIGINT NOT NULL DEFAULT 0,
    total_recharge_credits BIGINT NOT NULL DEFAULT 0,
    total_used_credits BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tenant_wallet_balance CHECK (balance_credits >= 0),
    CONSTRAINT chk_tenant_wallet_frozen CHECK (frozen_credits >= 0)
);

CREATE TABLE IF NOT EXISTS tenant_wallet_log (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id),
    biz_type VARCHAR(64) NOT NULL,
    biz_id VARCHAR(128),
    direction VARCHAR(16) NOT NULL,
    amount_credits BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    remark VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_wallet_log_tenant_id ON tenant_wallet_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_wallet_log_biz ON tenant_wallet_log(biz_type, biz_id);

CREATE TABLE IF NOT EXISTS ai_usage_log (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT,
    user_id BIGINT,
    api_key_id BIGINT,
    provider_code VARCHAR(64),
    model_code VARCHAR(128),
    request_id VARCHAR(64) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    real_cost NUMERIC(18, 8) NOT NULL DEFAULT 0,
    charge_credits BIGINT NOT NULL DEFAULT 0,
    profit NUMERIC(18, 8) NOT NULL DEFAULT 0,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_code VARCHAR(64),
    error_message VARCHAR(512),
    prompt_summary VARCHAR(512),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_tenant_id ON ai_usage_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_api_key_id ON ai_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_request_id ON ai_usage_log(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON ai_usage_log(created_at);
