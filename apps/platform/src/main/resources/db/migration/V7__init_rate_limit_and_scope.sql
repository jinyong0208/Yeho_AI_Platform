ALTER TABLE tenant_api_key
    ADD COLUMN IF NOT EXISTS scopes VARCHAR(1024) NOT NULL DEFAULT 'chat:completion,usage:read,billing:read';

ALTER TABLE ai_usage_log
    ADD COLUMN IF NOT EXISTS api_key_scopes VARCHAR(1024);

CREATE TABLE IF NOT EXISTS tenant_rate_limit (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL UNIQUE REFERENCES tenant(id),
    rpm_limit INTEGER,
    tpm_limit INTEGER,
    daily_credits_limit BIGINT,
    max_concurrent INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_key_rate_limit (
    id BIGINT PRIMARY KEY,
    api_key_id BIGINT NOT NULL UNIQUE REFERENCES tenant_api_key(id),
    tenant_id BIGINT NOT NULL REFERENCES tenant(id),
    rpm_limit INTEGER,
    tpm_limit INTEGER,
    daily_credits_limit BIGINT,
    max_concurrent INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_key_rate_limit_tenant_id ON api_key_rate_limit(tenant_id);
