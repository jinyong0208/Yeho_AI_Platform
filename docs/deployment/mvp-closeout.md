# MVP Closeout Deployment Runbook

This runbook is for the current MVP boundary: AI Gateway, Billing, Audit, API Key, Provider Adapter, wallet operations, price versions, and lightweight prompt/agent configuration.

It does not deploy centralized RAG, document storage, document chunks, vector indexes, OnlyOffice, or Kubernetes.

The latest closeout validation evidence is recorded in [MVP Closeout Validation Report](mvp-closeout-validation-report.md).

## Architecture Boundary

- EDMS owns documents, chunks, vector indexes, RAG retrieval, and permission filtering.
- Yeho AI Platform owns model calls, routing, API keys, tenants, credits, token statistics, audit, prompt/agent configuration, and provider adapters.
- MinIO is optional and not required for the MVP closeout path.
- pgvector is not part of the centralized Yeho AI Platform deployment.

## Environment

Create a local `.env` file before running Compose in a shared environment:

```dotenv
POSTGRES_PASSWORD=replace-with-strong-password
MINIO_ROOT_USER=replace-with-minio-user
MINIO_ROOT_PASSWORD=replace-with-minio-password
YEHO_SECURITY_DEFAULT_ADMIN_PASSWORD=replace-with-admin-password
YEHO_SECURITY_CRYPTO_SECRET=replace-with-32-char-or-longer-secret
YEHO_BILLING_DEFAULT_WALLET_CREDITS=100000
```

`YEHO_SECURITY_CRYPTO_SECRET` protects encrypted provider API keys at rest. Changing it after provider keys are saved will make existing encrypted values unreadable, so set it before configuring real providers.

## Start Core Services

```powershell
docker compose up -d postgres redis agent platform web
```

Optional MinIO:

```powershell
docker compose --profile optional-storage up -d minio
```

Health checks:

```powershell
docker compose ps
Invoke-RestMethod http://localhost:8080/api/v1/health
Invoke-RestMethod http://localhost:8000/api/v1/health
```

The platform container sets `TZ=Asia/Shanghai` so database timestamps, wallet logs, and smoke-test ordering stay consistent with local development runs.

## Build And Restart Platform

```powershell
docker compose up -d --no-deps --build platform
```

If Maven dependency resolution inside Docker is blocked by the local network, build the JAR on the host and use the prebuilt-image override:

```powershell
cd apps/platform
mvn -DskipTests package
cd ../..
docker compose -f docker-compose.yml -f docker-compose.prebuilt.yml up -d --no-deps --build platform
```

Check Flyway migration result:

```powershell
docker exec yeho-ai-postgres psql -U yeho -d yeho_ai_platform -c "select version, description, success from flyway_schema_history order by installed_rank desc limit 5;"
```

## MVP Smoke Tests

Core service smoke:

```powershell
.\scripts\smoke-all.ps1
```

Closeout smoke:

```powershell
.\scripts\smoke-mvp-closeout.ps1
```

Real provider smoke after configuring a provider:

```powershell
.\scripts\smoke-mvp-closeout.ps1 -RunProviderTest -ProviderCode "QWEN" -RequireProviderSuccess
```

## Required Manual Checks

- Create a tenant API key and confirm the full plaintext key is shown only once.
- Disable and enable that API key from the lifecycle API.
- Call `/v1/models` with missing and invalid keys and confirm OpenAI-compatible error shape.
- Configure DeepSeek or Qwen provider API key and run a provider test.
- Call `/v1/chat/completions` with `stream=false`.
- Confirm `ai_usage_log.price_version_id` is populated after gateway usage.
- Confirm wallet balance and wallet logs change after billable calls.
- Confirm cross-tenant API key operations do not succeed.

## Operational Notes

- Rotate provider API keys through `PUT /api/v1/providers/{id}/api-key`.
- Do not log full gateway API keys, provider API keys, or full customer prompts.
- Back up PostgreSQL before applying migrations in any persistent environment.
- Redis stores rate-limit counters. Clearing Redis resets short-window rate-limit state.
- Keep `YEHO_SECURITY_CRYPTO_SECRET` consistent across platform replicas and restarts.

## Current MVP Gaps

- Real provider success requires external DeepSeek, Qwen, or OpenAI-compatible credentials.
- API key lifecycle, wallet operations, provider resilience, and price versions have API/console coverage; continue manual UX polish before production rollout.
- Provider resilience has runtime behavior, console configuration, and smoke coverage, but still needs richer automated regression tests.
- No centralized document, chunk, or vector data is deployed by design.
