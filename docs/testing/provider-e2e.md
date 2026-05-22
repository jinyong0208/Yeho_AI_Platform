# Real Provider End-to-End Test

This runbook verifies that a real OpenAI-compatible provider can be configured and called through Yeho AI Platform.

The test must go through the platform Provider Adapter and Model Router. Business code and frontend code must not call provider SDKs directly.

## Preconditions

- Platform, PostgreSQL, and Redis are running.
- You can log in to the admin console API.
- The provider account has an active API key.
- The model has a positive wallet balance path through the default tenant or your target tenant.

Do not paste provider API keys into chat, logs, screenshots, or bug reports.

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
