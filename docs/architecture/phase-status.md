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
- Shared OpenAI-compatible error response writer for `/v1/**` gateway errors.
- Provider adapter abstraction.
- OpenAI, DeepSeek, and Qwen adapter baseline.
- Model router by `model_code`.
- API key authentication with hashed storage.
- Tenant recognition by API key.
- Request ID propagation baseline.
- Token usage log and wallet deduction baseline.
- Provider API key encrypted storage.
- OpenAI-compatible `GET /v1/models`.
- Shared OpenAI-compatible error response writer for `/v1/**` gateway errors.

### Governance And Resilience

- Tenant/API key scoped permissions.
- API key lifecycle APIs for disable, enable, and usage summary.
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

### Wallet Operations

- Wallet balance query and wallet logs.
- Manual recharge endpoint.
- Recharge order create, confirm, list, and close.
- Low-balance alert query for wallet operations.

### Cost Accuracy

- Model price versions.
- Current model price version pointer.
- Usage logs record `price_version_id` for historical cost/profit traceability.

### MVP Closeout Operations

- Closeout smoke script for OpenAI-compatible errors, API key lifecycle, tenant isolation, wallet alert query, price version list, and provider health list.
- Deployment closeout runbook with `.env` guidance and secret handling notes.
- Real provider end-to-end runbook for DeepSeek and Qwen.
- Console entry points for API key enable/disable/usage summary, recharge order close/confirm, low-balance alerts, provider health, and model price versions.
- Provider API key rotation console modal that does not expose stored secrets.
- Lightweight finance reconciliation exports for recharge orders and wallet ledger rows.
- Backend regression tests for API key scopes, tenant isolation rules, OpenAI-compatible error envelope, and wallet credit accounting.
- Rate limit service regression tests for Redis counter rollback, audit logging, and daily/concurrent release behavior.
- OpenAI-compatible gateway error regression script for models, chat completions, embeddings, invalid keys, and scope denial.
- Provider E2E script for DeepSeek/Qwen/OpenAI-compatible probe and optional gateway chat verification without printing provider secrets.

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
- Provider connection test script is ready; actual real DeepSeek/Qwen success still requires external provider keys.
- Provider base URL and resilience configuration need final console polish.
- Recharge-order reconciliation exports are lightweight MVP files; formal finance reconciliation workflow remains future work.
- Rate limit concurrency and TPM behavior has service-level regression coverage; endpoint-level integration tests are still pending.
- OpenAI-compatible error body consistency now has a script-level regression check; endpoint-level JUnit/MockMvc tests are still pending.

### P1 Hardening

- Prompt publish lifecycle needs stricter state transition validation.
- Agent execution should be connected to the gateway route when product flow is finalized.
- Agent execute log should include richer trace filtering in console.

### P2 Reserved

- Embedding provider abstraction should be generalized beyond Qwen.
- EDMS integration should add signed callback examples and sample payload fixtures.
- Python agent service should consume EDMS retrieval results through protocol interfaces only.

## Next Recommended Work

1. Run real DeepSeek and Qwen provider tests with production-like credentials.
2. Add endpoint-level regression tests for rate limits, `/v1/chat/completions`, `/v1/embeddings`, and `/v1/models`.
3. Add provider health and circuit breaker state regression tests.
4. Add provider base URL/resilience configuration UX and formal finance reconciliation workflow.
