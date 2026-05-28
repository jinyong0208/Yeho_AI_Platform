ALTER TABLE tenant_recharge_order
    ADD COLUMN IF NOT EXISTS payer_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS payer_account VARCHAR(128),
    ADD COLUMN IF NOT EXISTS payment_proof_no VARCHAR(128);

