# AI Gateway Database

## New Tables

- `ai_provider`
- `ai_model`
- `tenant_api_key`
- `ai_usage_log`
- `tenant_wallet`
- `tenant_wallet_log`

## Table Notes

### `ai_provider`

Stores provider metadata and the encrypted provider API key.

### `ai_model`

Stores model routing and billing configuration.

### `tenant_api_key`

Stores hashed tenant API keys only. Plaintext keys are never persisted.

### `tenant_wallet`

Stores available balance, frozen credits, recharge totals, and usage totals.

### `tenant_wallet_log`

Stores reserve, settlement, release, and adjustment movements.

### `ai_usage_log`

Stores every gateway call with request id, tenant id, model code, token usage, and charge data.

