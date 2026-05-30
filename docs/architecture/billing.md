# Billing Architecture

## Scope

Phase 3 extends the gateway billing foundation with admin APIs for wallets, recharge orders, wallet logs, usage logs, and usage summaries.

## Credits

The platform bills with `Credits`. Currency conversion stays at the recharge/order layer. Model calls only consume credits.

MVP exchange rate:

- `1 CNY = 1000 Credits`
- Regular document / RAG conversations should normally land around `500-2500 Credits`, about `0.5-2.5 CNY`.

Default MVP model rates:

```text
qwen-plus:      input 0.2000 Credits / Token, output 0.8000 Credits / Token
deepseek-chat: input 0.3000 Credits / Token, output 0.9000 Credits / Token
```

Example: `qwen-plus` with 1000 input tokens and 1000 output tokens consumes about 1000 Credits, which is about `1 CNY` under the default exchange rate.

## Transaction Rules

- AI calls reserve credits before provider execution
- Successful calls settle by actual token usage
- Failed calls release reserved credits
- Wallet mutations write `tenant_wallet_log`
- Gateway calls always write `ai_usage_log`

## Current Payment Mode

Recharge orders use an offline self-service flow in MVP:

- Tenant admins submit recharge orders from the console
- Users complete bank transfer or offline payment with the order number in the payment remark
- Optional payer name, payer account suffix, and voucher number help finance reconciliation
- Finance or platform admins confirm the order before credits are posted

External payment gateway integration is intentionally deferred.
