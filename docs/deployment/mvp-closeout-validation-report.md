# MVP Closeout Validation Report

Date: 2026-05-23

This report records the current MVP closeout validation state for Yeho AI Platform.

The validated scope is the enterprise AI Gateway / Billing / Audit / lightweight Agent Orchestration boundary. It does not include centralized RAG, customer document storage, document chunk storage, vector index storage, OnlyOffice, Kubernetes, complex Workflow runtime, or multi-agent autonomy.

## Product Boundary

- EDMS owns customer documents, document chunks, vector indexes, RAG retrieval, and permission filtering.
- Yeho AI Platform owns model calls, provider routing, API keys, tenants, wallets, credits, token statistics, audit logs, prompt/agent configuration, and provider adapters.
- Provider API keys are configured through the encrypted provider-key endpoint.
- Tenant gateway API keys are stored by hash and the plaintext key is only available at creation time.
- Full prompts, provider API keys, and full gateway API keys must not be written to logs or reports.

## Validation Summary

The MVP closeout validation passed for:

- Java regression tests.
- Web production build.
- Docker Compose platform build.
- Default Compose startup and health check.
- Gateway integration smoke.
- MVP closeout smoke.
- OpenAI-compatible error regression.
- Real DeepSeek provider probe and gateway chat.
- Real Qwen provider probe and gateway chat.
- Real Qwen embedding gateway call.
- Endpoint-level TPM and max-concurrency rate-limit rejection.

## Commands Verified

Backend:

```powershell
cd apps/platform
mvn test
```

Result: 33 tests passed.

Frontend:

```powershell
cd apps/web
npm run build
```

Result: build passed.

Compose build:

```powershell
docker compose build --progress plain platform
```

Result: platform image build passed.

Smoke tests:

```powershell
.\scripts\smoke-gateway-integration.ps1
.\scripts\smoke-mvp-closeout.ps1
.\scripts\regression-openai-errors.ps1
.\scripts\qwen-embedding-e2e.ps1
.\scripts\smoke-rate-limit-hardening.ps1
docker compose config --quiet
```

Result: all passed.

## Real Provider E2E Evidence

DeepSeek:

- Provider: `DEEPSEEK`
- Model: `deepseek-chat`
- Provider test request id: `d747bc18-f531-4d9d-ab08-3d55789613ca`
- Gateway chat request id: `902558fb-8b3a-437b-b402-1e88576b4e06`
- Token usage: input `9`, output `2`, total `11`
- Charge credits: `13`
- Final provider health: `HEALTHY`

Qwen:

- Provider: `QWEN`
- Model: `qwen-plus`
- Provider test request id: `07a6da6c-711b-4fcb-98c2-50aa3fd23603`
- Gateway chat request id: `62904dcc-b5f6-4131-85be-441396c8b9a8`
- Token usage: input `12`, output `1`, total `13`
- Charge credits: `14`
- Final provider health: `HEALTHY`

For both providers, wallet logs contained the expected `RESERVE`, `RELEASE`, and `SETTLE` records tied to the gateway request id, and usage logs recorded tenant, API key, provider, model, token usage, charge credits, real cost, profit, and price version data.

Qwen Embedding:

- Provider: `QWEN`
- Model: `text-embedding-v4`
- Gateway embedding request id: `qwen-embedding-e2e-1779514862236`
- HTTP status: `200`
- Vector dimensions: `1024`
- Token usage: prompt `26`, total `26`
- Usage log recorded: `true`

The embedding validation returned the vector directly to the caller and did not persist customer documents, chunks, or vectors in Yeho AI Platform.

Rate Limit Hardening:

- TPM request id: `rate-hardening-tpm-1779514678366`
- TPM status: `429`
- TPM error code: `rate_limit_tpm_exceeded`
- Concurrent first request id: `rate-hardening-concurrent-first-1779514678366`
- Concurrent first status: `200`
- Concurrent second request id: `rate-hardening-concurrent-second-1779514678366`
- Concurrent second status: `429`
- Concurrent error code: `rate_limit_concurrent_exceeded`

## Security And Secret Handling

- The temporary local helper file `C:\tmp\yeho-provider-secrets.ps1` contains plaintext provider keys and should be deleted after validation.
- Real provider keys must not be committed, pasted into tickets, screenshots, chat logs, or shell history exports.
- A local sensitive scan found only demo/invalid keys and safe log statements.
- The gateway integration smoke script temporarily points providers to the local mock provider. If final database state needs to remain pointed at real providers, run `scripts/provider-e2e.ps1` again after mock smoke tests.

## Still Pending

- Endpoint-level provider timeout/retry/circuit-breaker integration tests.
- Final console polish for provider resilience configuration.
- Broader manual browser QA for the console pages.
- Production deployment checklist for backup, restore, log retention, and monitoring thresholds.

## Release Recommendation

The current codebase is acceptable for MVP pilot validation of:

- OpenAI-compatible chat gateway.
- Provider adapter routing for DeepSeek and Qwen.
- API key lifecycle and scoped permissions.
- Wallet reservation, settlement, and billing logs.
- Usage, audit, provider health, and cost/profit observability.

Before production rollout, complete the pending hardening items above and remove any local plaintext provider-key helper files.
