CREATE TABLE IF NOT EXISTS tenant_recharge_order (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id),
    order_no VARCHAR(64) NOT NULL UNIQUE,
    amount_cny NUMERIC(18, 2) NOT NULL DEFAULT 0,
    credits BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    pay_channel VARCHAR(64),
    paid_at TIMESTAMP,
    remark VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_recharge_order_tenant_id ON tenant_recharge_order(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_recharge_order_status ON tenant_recharge_order(status);
CREATE INDEX IF NOT EXISTS idx_tenant_recharge_order_created_at ON tenant_recharge_order(created_at);
