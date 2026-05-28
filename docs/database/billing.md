# Billing Database

## tenant_recharge_order

Stores recharge order records. Phase 3 supports manual confirmation only.
Tenant admins can submit orders, while finance or platform admins confirm offline payment and post credits.

Important fields:

- `tenant_id`
- `order_no`
- `amount_cny`
- `credits`
- `status`
- `pay_channel`
- `payer_name`
- `payer_account`
- `payment_proof_no`
- `paid_at`
- `created_at`
- `updated_at`

Status values:

- `CREATED`
- `PAID`
- `CLOSED`

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
