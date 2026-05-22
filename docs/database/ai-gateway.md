# AI Gateway Database

## New Tables

- `ai_provider`
- `ai_model`
- `tenant_api_key`
- `ai_usage_log`
- `tenant_wallet`
- `tenant_wallet_log`

No table in Yeho AI Platform stores customer original documents, document chunks, or vector indexes.

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

Prompt raw text is not stored by default. RAG context from EDMS should be treated as transient request context unless a tenant explicitly enables safe, redacted prompt logging.

## Vector Storage Boundary

pgvector is not part of the centralized Yeho AI Platform database boundary. EDMS private deployments, or future private knowledge-base components, own vector index storage and retrieval.
