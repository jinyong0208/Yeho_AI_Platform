# Real Provider End-to-End Test

This runbook verifies that a real OpenAI-compatible provider can be configured and called through Yeho AI Platform.

The test must go through the platform Provider Adapter and Model Router. Business code and frontend code must not call provider SDKs directly.

## Preconditions

- Platform, PostgreSQL, and Redis are running.
- You can log in to the admin console API.
- The provider account has an active API key.
- The model has a positive wallet balance path through the default tenant or your target tenant.

Do not paste provider API keys into chat, logs, screenshots, or bug reports.

## Scripted Run

Preferred MVP closeout command:

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode QWEN `
  -ProviderApiKey "<QWEN_API_KEY>"
```

DeepSeek:

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode DEEPSEEK `
  -ProviderApiKey "<DEEPSEEK_API_KEY>"
```

The script:

- Logs in to the admin API.
- Finds the provider by `providerCode`.
- Sets the provider base URL to the known OpenAI-compatible default.
- Updates the provider API key through the encrypted provider-key endpoint when `ProviderApiKey` is provided.
- Runs `/api/providers/{providerId}/test`.
- Creates a temporary tenant API key for gateway chat when `GatewayApiKey` is not provided.
- Calls `/v1/chat/completions`.
- Revokes the temporary gateway API key.
- Does not print the provider API key.

No-mutation diagnostic mode without a real provider key:

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode QWEN `
  -SkipProviderUpdate `
  -SkipProviderKeyUpdate `
  -SkipGatewayChat `
  -AllowProviderFailure
```

Use this mode to verify login, provider lookup, provider-health recording, and script wiring without overwriting a local mock-provider configuration. It is not a real Qwen or DeepSeek end-to-end validation.

Provider probe only:

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode DEEPSEEK `
  -ProviderApiKey "<DEEPSEEK_API_KEY>" `
  -SkipGatewayChat
```

## Environment Variable Helper

When running locally, keep real provider keys in the shell environment and pass them to the script without printing them:

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode QWEN `
  -ProviderApiKey $env:QWEN_API_KEY

.\scripts\provider-e2e.ps1 `
  -ProviderCode DEEPSEEK `
  -ProviderApiKey $env:DEEPSEEK_API_KEY
```

The validation is only considered complete when `/api/providers/{providerId}/test` succeeds against the real provider endpoint and `/v1/chat/completions` succeeds through the gateway with wallet deduction and usage-log records.

## Login

```powershell
$login = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"tenantCode":"default","username":"admin","password":"Admin@123456"}'

$headers = @{ Authorization = "Bearer $($login.data.accessToken)" }
```

## Configure DeepSeek

List providers and find the DeepSeek id:

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/providers" -Headers $headers
```

Set base URL and enable the provider:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/providers/<DEEPSEEK_PROVIDER_ID>" `
  -Method Put `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"providerName":"DeepSeek","baseUrl":"https://api.deepseek.com","status":"ACTIVE"}'
```

Store the encrypted provider API key:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/providers/<DEEPSEEK_PROVIDER_ID>/api-key" `
  -Method Put `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"apiKey":"<DEEPSEEK_API_KEY>"}'
```

Run the provider probe:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/providers/<DEEPSEEK_PROVIDER_ID>/test" `
  -Method Post `
  -Headers $headers
```

## Configure Qwen

Qwen uses Alibaba Cloud DashScope OpenAI-compatible mode:

```text
https://dashscope.aliyuncs.com/compatible-mode/v1
```

Set base URL and API key:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/providers/<QWEN_PROVIDER_ID>" `
  -Method Put `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"providerName":"Qwen","baseUrl":"https://dashscope.aliyuncs.com/compatible-mode/v1","status":"ACTIVE"}'

Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/providers/<QWEN_PROVIDER_ID>/api-key" `
  -Method Put `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"apiKey":"<QWEN_API_KEY>"}'
```

Run the provider probe:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/providers/<QWEN_PROVIDER_ID>/test" `
  -Method Post `
  -Headers $headers
```

## Gateway Chat Completion

Use a tenant API key with `chat:completion` scope:

```powershell
$gatewayHeaders = @{ Authorization = "Bearer yh_sk_demo_default_key" }

Invoke-RestMethod `
  -Uri "http://localhost:8080/v1/chat/completions" `
  -Method Post `
  -Headers $gatewayHeaders `
  -ContentType "application/json" `
  -Body '{
    "model": "deepseek-chat",
    "messages": [
      { "role": "user", "content": "Return only: pong" }
    ],
    "temperature": 0.2,
    "max_tokens": 16,
    "stream": false
  }'
```

For Qwen:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/v1/chat/completions" `
  -Method Post `
  -Headers $gatewayHeaders `
  -ContentType "application/json" `
  -Body '{
    "model": "qwen-plus",
    "messages": [
      { "role": "user", "content": "Return only: pong" }
    ],
    "temperature": 0.2,
    "max_tokens": 16,
    "stream": false
  }'
```

## Verify Logs And Billing

Check usage logs:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/usage-logs?tenantId=$($login.data.tenantId)" `
  -Method Get `
  -Headers $headers
```

Check wallet:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/wallets/$($login.data.tenantId)" `
  -Method Get `
  -Headers $headers
```

Check provider health:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/providers/health" `
  -Method Get `
  -Headers $headers
```

## Pass Criteria

- Provider probe returns `success=true`.
- Gateway chat completion returns OpenAI-compatible `choices` and `usage`.
- `ai_usage_log` has the request id, tenant id, API key id, provider code, model code, token usage, `charge_credits`, `real_cost`, `profit`, and `price_version_id`.
- Wallet balance decreases only through the platform billing path.
- Provider API key is never returned by any API.

## Failure Notes

- `401` from provider usually means the external provider key is invalid or missing.
- `API key scope denied` means the tenant gateway key lacks `chat:completion` or `models:read`.
- Circuit breaker failures should be visible from `/api/providers/health`.
- Full customer prompts and provider keys must not be added to support logs.
- If the provider probe succeeds but gateway chat fails, check model status, tenant wallet balance, API key scopes, and `ai_usage_log`.
- If provider health remains `UNHEALTHY`, check `provider_test_log` for the latest request id and sanitized error.
