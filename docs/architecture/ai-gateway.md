# AI Gateway Architecture

## Goal

Yeho AI Platform exposes one unified OpenAI-compatible gateway and routes requests to different model providers through adapters.

## Request Flow

1. Client calls `POST /v1/chat/completions`
2. Platform validates the `Authorization: Bearer <tenant_api_key>` header
3. The API key is hashed in database lookups, never stored in plaintext
4. `model_code` is resolved through `ModelRouter`
5. The selected provider is handled by `AiProviderAdapter`
6. Credits are reserved before the provider call and settled after the response
7. Every request writes an `ai_usage_log` row
8. `request_id` is propagated through the request context and returned in `X-Request-Id`

## Adapter Layer

- `AiProviderAdapter`
- `OpenAiAdapter`
- `DeepSeekAdapter`
- `QwenAdapter`

All provider calls use OpenAI-compatible `/v1/chat/completions` payloads.

## Billing Flow

- `tenant_wallet` stores the available balance
- `tenant_wallet_log` stores reserve, settle, release, and adjustment movements
- `ai_usage_log` stores token usage and charge details

## Local Development

The current bootstrap seeds a local mock provider so the gateway can be tested without external network access.

