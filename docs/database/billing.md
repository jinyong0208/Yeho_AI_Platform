# Billing Database

## tenant_recharge_order

Stores recharge order records. Phase 3 supports manual confirmation only.

Important fields:

- `tenant_id`
- `order_no`
- `amount_cny`
- `credits`
- `status`
- `pay_channel`
- `paid_at`
- `created_at`
- `updated_at`

Status values:

- `CREATED`
- `PAID`

## Wallet Flow

Recharge confirmation writes:

- one `tenant_recharge_order` update
- one `tenant_wallet` balance update
- one `tenant_wallet_log` row

AI gateway calls write:

- reserve log before provider call
- settle log after successful usage calculation
- release log when reserved credits are unused or request fails
- one `ai_usage_log` row for both success and failure

