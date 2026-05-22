# MVP Closeout Smoke Test

This smoke test covers the MVP closeout surface without adding Agent Workflow, centralized RAG, document storage, or vector storage.

## Scope

The script verifies:

- Platform health and admin login.
- OpenAI-compatible error envelope for `/v1/models`.
- `X-Request-Id` on public gateway errors.
- API key create, disable, enable, usage summary, and revoke.
- API key scope for `models:read`.
- Cross-tenant denial for API key lifecycle and console API key list.
- Wallet low-balance alert query.
- Model price version list.
- Provider health list.
- Optional real provider connection test.

The script creates temporary tenants, users, and API keys, then deletes or revokes them in cleanup.

## Run

Start the platform first:

```powershell
docker compose up -d postgres redis agent platform
```

Run the smoke test:

```powershell
.\scripts\smoke-mvp-closeout.ps1
```

With custom admin credentials:

```powershell
.\scripts\smoke-mvp-closeout.ps1 `
  -PlatformBaseUrl "http://localhost:8080" `
  -TenantCode "default" `
  -Username "admin" `
  -Password "Admin@123456"
```

## Real Provider Probe

After configuring a real provider API key, run:

```powershell
.\scripts\smoke-mvp-closeout.ps1 `
  -RunProviderTest `
  -ProviderCode "QWEN" `
  -RequireProviderSuccess
```

Or by provider id:

```powershell
.\scripts\smoke-mvp-closeout.ps1 `
  -RunProviderTest `
  -ProviderId 2057643291887177729 `
  -RequireProviderSuccess
```

If the provider account is not configured, omit `-RunProviderTest`. The base closeout smoke test still verifies the gateway, billing, wallet, price-version, and tenant-isolation paths.

## Expected Output

The script prints a JSON summary similar to:

```json
{
  "platform": "UP",
  "openAiMissingAuthStatus": 401,
  "openAiInvalidKeyStatus": 401,
  "requestIdHeader": true,
  "apiKeyLifecycle": "create-disable-enable-revoke",
  "tenantIsolationLifecycleStatus": 404,
  "tenantIsolationConsoleStatus": 500,
  "priceVersionRows": 1,
  "providerHealthRows": 3
}
```

`tenantIsolationConsoleStatus` only needs to be non-2xx. A `403`, `404`, or current global business-error mapping is acceptable for the closeout smoke because the critical requirement is that cross-tenant access does not succeed.

## Safety

- The script never prints full provider API keys.
- The temporary gateway API key is only kept in memory for the test.
- The test prompt surface is limited to `/v1/models`; it does not send customer prompts to a model.
- No customer documents, document chunks, or vectors are created.
