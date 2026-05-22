# Billing Architecture

## Scope

Phase 3 extends the gateway billing foundation with admin APIs for wallets, recharge orders, wallet logs, usage logs, and usage summaries.

## Credits

The platform bills with `Credits`. Currency conversion stays at the recharge/order layer. Model calls only consume credits.

## Transaction Rules

- AI calls reserve credits before provider execution
- Successful calls settle by actual token usage
- Failed calls release reserved credits
- Wallet mutations write `tenant_wallet_log`
- Gateway calls always write `ai_usage_log`

## Current Payment Mode

Recharge orders are manually confirmed. External payment gateway integration is intentionally deferred.

