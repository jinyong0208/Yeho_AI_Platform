# MVP Manual Test Guide

This guide is for local manual verification after the MVP hardening work.

The product boundary remains:

- EDMS owns documents, chunks, vector indexes, RAG retrieval, and permission filtering.
- Yeho AI Platform owns Gateway, Billing, Audit, tenants, API keys, provider adapters, prompt/agent configuration, and runtime observability.
- Do not create centralized document storage, centralized vectors, or OnlyOffice flows in this platform test.

## 1. Start The Platform

From the repository root:

```powershell
docker compose up -d postgres redis agent platform web
```

Check containers:

```powershell
docker ps
```

Expected Yeho services:

- `yeho-ai-postgres`
- `yeho-ai-redis`
- `yeho-ai-agent`
- `yeho-ai-platform`
- `yeho-ai-web`

Health checks:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
Invoke-RestMethod http://localhost:8000/api/v1/health
```

## 2. Open The Console

Open:

```text
http://127.0.0.1:5173/login
```

Default local login:

```text
Tenant Code: default
Username: admin
Password: Admin@123456
```

After login, the `SUPER_ADMIN` menu should show:

- Dashboard
- Tenant Management
- Provider Health
- Provider Management
- Rate Limits
- API Key Scope
- Provider Analytics
- Billing Analytics
- Global Audit
- Workflow (Preview)

## 3. Provider Configuration Check

Open:

```text
Provider Health
```

Verify:

- Provider cards show health status.
- Cards show timeout and retry badges.
- Click `配置`.
- The modal shows Base URL, status, timeout, retry, circuit breaker, cooldown, and fallback model.
- Saving the modal should update `/api/v1/providers/{id}`.
- Provider API Key rotation is still separate and should never display the existing key.

## 4. Provider Secret File Format

Keep real provider keys outside Git. For local PowerShell tests, use:

```powershell
$env:DEEPSEEK_API_KEY = "replace-with-deepseek-key"
$env:QWEN_API_KEY = "replace-with-qwen-key"
```

Example load command:

```powershell
. C:\tmp\yeho-provider-secrets.ps1
```

Never paste real keys into docs, Git commits, console logs, or screenshots.

## 5. Core Smoke Test

Run:

```powershell
.\scripts\smoke-mvp-closeout.ps1
```

This covers:

- Platform health
- Console login token
- OpenAI-compatible error body
- API key lifecycle
- API key scope
- Tenant isolation
- Wallet low-balance query
- Model price versions
- Provider health list

## 6. Real Provider Chat Test

After loading real keys, run the provider E2E script. For Qwen:

```powershell
. C:\tmp\yeho-provider-secrets.ps1
.\scripts\provider-e2e.ps1 -ProviderCode "QWEN"
```

For DeepSeek:

```powershell
. C:\tmp\yeho-provider-secrets.ps1
.\scripts\provider-e2e.ps1 -ProviderCode "DEEPSEEK"
```

Expected:

- `/v1/chat/completions` returns HTTP 200.
- Response is OpenAI-compatible.
- `ai_usage_log` contains the request.
- Wallet balance and wallet log reflect the charge.

## 7. Qwen Embedding Reservation Test

Embedding is reserved for EDMS or future private knowledge scenarios. The platform does not store vectors.

Run:

```powershell
. C:\tmp\yeho-provider-secrets.ps1
.\scripts\qwen-embedding-e2e.ps1
```

Expected:

- `/v1/embeddings` returns HTTP 200.
- Qwen embedding dimension is returned by the provider.
- Usage log is written.
- No centralized vector index or document chunk is created.

## 8. Rate Limit Hardening Test

Run:

```powershell
.\scripts\smoke-rate-limit-hardening.ps1
```

Expected:

- TPM overflow returns HTTP 429 with OpenAI-compatible `rate_limit_tpm_exceeded`.
- Concurrent overflow returns HTTP 429 with OpenAI-compatible `rate_limit_concurrent_exceeded`.
- Audit and usage records keep request IDs.

## 9. Frontend Build Verification

Run:

```powershell
cd apps\web
npm run build
```

Expected:

- TypeScript build passes.
- Vite production build passes.

## 10. Backend Regression

Run:

```powershell
cd apps\platform
mvn test
```

Expected:

- All backend tests pass.

## 11. Known Notes

- Real provider tests require valid DeepSeek or Qwen account credentials and network access.
- `C:\tmp\yeho-provider-secrets.ps1` is local-only and should be deleted or protected after validation.
- MinIO is optional and not required for MVP AI Gateway testing.
- Workflow remains preview-only; no runtime engine is enabled.
- Centralized RAG, customer document storage, document chunks, and vector indexes are intentionally out of scope.
