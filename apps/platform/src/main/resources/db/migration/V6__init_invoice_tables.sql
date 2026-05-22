CREATE TABLE IF NOT EXISTS tenant_invoice_application (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id),
    invoice_title VARCHAR(200) NOT NULL,
    tax_no VARCHAR(64),
    amount_cny NUMERIC(18, 2) NOT NULL,
    invoice_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    email VARCHAR(128),
    applied_at TIMESTAMP NOT NULL,
    issued_at TIMESTAMP,
    remark VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invoice_application_tenant_created
    ON tenant_invoice_application (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_invoice_application_status
    ON tenant_invoice_application (status);
