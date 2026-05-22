# Yeho AI Platform Phase Status

## Product Boundary

Yeho AI Platform is positioned as an enterprise AI Gateway / Billing / Audit / Agent Orchestration platform.

The platform manages capabilities, not customer knowledge data:

- EDMS owns source documents, document chunks, vector indexes, RAG retrieval, and permission filtering.
- Yeho AI Platform owns model calls, model routing, API keys, tenants, wallets, token usage, audit logs, prompt and agent orchestration, and provider adapters.
- Yeho AI Platform must not centrally store customer documents, document chunks, or customer vector indexes.

## Completed

### Core Platform

- Monorepo skeleton for Java platform, React console, and Python agent service.
- Docker Compose baseline with PostgreSQL and Redis.
- Flyway migrations for core platform tables.
- Tenant, user, role, authentication, and RBAC baseline.
- Audit log baseline and console query entry.

### AI Gateway

- OpenAI-compatible `POST /v1/chat/completions`.
- OpenAI-compatible `GET /v1/models`.
- Provider adapter abstraction.
- OpenAI, DeepSeek, and Qwen adapter baseline.
- Model router by `model_code`.
- API key authentication with hashed storage.
- Tenant recognition by API key.
- Request ID propagation baseline.
- Token usage log and wallet deduction baseline.
- Provider API key encrypted storage.

### Governance And Resilience

- Tenant/API key scoped permissions.
- Tenant/API key rate limit baseline for RPM, TPM, daily credits, and max concurrency.
- Redis-backed rate limit counters.
- Provider timeout, retry, circuit breaker, fallback, and health visibility baseline.
- Provider connection test API, health details console, and provider test log.
- Cost, revenue, profit, credits, and token statistics baseline.

### Console

- Modern Mantine-based AI console style.
- Provider, model, API key, wallet, usage log, rate limit, prompt template, agent config, and analytics pages.
- Profit Dashboard and Provider Cost Dashboard using chart components.

### Prompt And Agent Management

- Prompt template and version management.
- Agent config management.
- Agent execute log and trace query baseline.
- No multi-agent autonomy, tool calling runtime, or workflow engine yet.

### Embeddings And EDMS Integration

- OpenAI-compatible `POST /v1/embeddings` preview.
- Qwen embedding route preview.
- `embedding:create` API key scope.
- Embedding usage failure logging with request scope.
- EDMS RAG protocol document.
- No centralized vector store, document chunk storage, or document storage in Yeho AI Platform.

## Not Completed Yet

### P0 Hardening

- End-to-end success smoke test with a real Qwen embedding provider key.
- Provider resilience behavior needs richer automated tests.
- Provider connection test should be verified against real DeepSeek, Qwen, and OpenAI-compatible endpoints.
- Rate limit concurrency and TPM behavior needs automated integration tests.
- OpenAI-compatible error body consistency should be reviewed across chat and embeddings.

### P1 Hardening

- Prompt publish lifecycle needs stricter state transition validation.
- Agent execution should be connected to the gateway route when product flow is finalized.
- Agent execute log should include richer trace filtering in console.

### P2 Reserved

- Embedding provider abstraction should be generalized beyond Qwen.
- EDMS integration should add signed callback examples and sample payload fixtures.
- Python agent service should consume EDMS retrieval results through protocol interfaces only.

## Next Recommended Work

1. Add automated integration tests for API key scope, tenant limit, and wallet deduction.
2. Add OpenAI-compatible error response tests for `/v1/chat/completions` and `/v1/embeddings`.
3. Add provider health and circuit breaker state smoke tests.
4. Add sample EDMS RAG protocol fixtures without storing customer knowledge data.
