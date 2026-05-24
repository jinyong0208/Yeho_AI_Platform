# 真实 Provider 端到端测试

本文档用于验证真实 OpenAI-compatible Provider 能够通过 Yeho AI Platform 完成配置和调用。

测试必须经过平台的 Provider Adapter 和 Model Router。业务代码和前端代码禁止直接调用 Provider SDK。

## 前置条件

- Platform、PostgreSQL 和 Redis 已启动。
- 可以登录 admin 控制台 API。
- Provider 账号拥有有效 API Key。
- 默认租户或目标租户拥有可用的钱包余额。

不要把 Provider API Key 粘贴到聊天、日志、截图或问题报告中。

## 脚本运行

MVP 收口阶段推荐命令：

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode QWEN `
  -ProviderApiKey "<QWEN_API_KEY>"
```

DeepSeek：

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode DEEPSEEK `
  -ProviderApiKey "<DEEPSEEK_API_KEY>"
```

脚本会执行：

- 登录 admin API。
- 根据 `providerCode` 查找 Provider。
- 将 Provider Base URL 设置为对应的 OpenAI-compatible 默认地址。
- 传入 `ProviderApiKey` 时，通过加密 Provider Key 接口更新 Provider API Key。
- 调用 `/api/providers/{providerId}/test`。
- 未传入 `GatewayApiKey` 时，创建临时租户 API Key 用于 Gateway Chat。
- 调用 `/v1/chat/completions`。
- 吊销临时 Gateway API Key。
- 不打印 Provider API Key。

## 无真实密钥的诊断模式

不改动 Provider 配置的诊断模式：

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode QWEN `
  -SkipProviderUpdate `
  -SkipProviderKeyUpdate `
  -SkipGatewayChat `
  -AllowProviderFailure
```

该模式用于验证登录、Provider 查询、Provider Health 记录和脚本流程，不会覆盖本地 mock provider 配置。它不代表真实 Qwen 或 DeepSeek 端到端验证通过。

## 仅测试 Provider 探测

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode DEEPSEEK `
  -ProviderApiKey "<DEEPSEEK_API_KEY>" `
  -SkipGatewayChat
```

## 环境变量辅助方式

本地运行时建议把真实 Provider Key 放在 shell 环境变量中，并以变量形式传入脚本，避免打印：

```powershell
.\scripts\provider-e2e.ps1 `
  -ProviderCode QWEN `
  -ProviderApiKey $env:QWEN_API_KEY

.\scripts\provider-e2e.ps1 `
  -ProviderCode DEEPSEEK `
  -ProviderApiKey $env:DEEPSEEK_API_KEY
```

只有当 `/api/providers/{providerId}/test` 对真实 Provider Endpoint 成功，并且 `/v1/chat/completions` 通过网关成功返回、完成钱包扣费和 usage log 记录时，本验证才算完成。

## 登录

```powershell
$login = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"tenantCode":"default","username":"admin","password":"Admin@123456"}'

$headers = @{ Authorization = "Bearer $($login.data.accessToken)" }
```

## 配置 DeepSeek

列出 Providers 并找到 DeepSeek ID：

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/providers" -Headers $headers
```

设置 Base URL 并启用 Provider：

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/providers/<DEEPSEEK_PROVIDER_ID>" `
  -Method Put `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"providerName":"DeepSeek","baseUrl":"https://api.deepseek.com","status":"ACTIVE"}'
```

保存加密后的 Provider API Key：

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/providers/<DEEPSEEK_PROVIDER_ID>/api-key" `
  -Method Put `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"apiKey":"<DEEPSEEK_API_KEY>"}'
```

运行 Provider 探测：

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/providers/<DEEPSEEK_PROVIDER_ID>/test" `
  -Method Post `
  -Headers $headers
```

## 配置 Qwen

Qwen 使用阿里云 DashScope OpenAI-compatible 模式：

```text
https://dashscope.aliyuncs.com/compatible-mode/v1
```

设置 Base URL 和 API Key：

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

运行 Provider 探测：

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/providers/<QWEN_PROVIDER_ID>/test" `
  -Method Post `
  -Headers $headers
```

## Gateway Chat Completion

使用带有 `chat:completion` scope 的租户 API Key：

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

Qwen：

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

## 验证日志和计费

查看 usage logs：

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/usage-logs?tenantId=$($login.data.tenantId)" `
  -Method Get `
  -Headers $headers
```

查看钱包：

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/wallets/$($login.data.tenantId)" `
  -Method Get `
  -Headers $headers
```

查看 Provider Health：

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/providers/health" `
  -Method Get `
  -Headers $headers
```

## 通过标准

- Provider 探测返回 `success=true`。
- Gateway Chat Completion 返回 OpenAI-compatible 的 `choices` 和 `usage`。
- `ai_usage_log` 记录 request id、tenant id、API key id、provider code、model code、token usage、`charge_credits`、`real_cost`、`profit` 和 `price_version_id`。
- 钱包余额只通过平台计费链路扣减。
- 任何 API 都不能返回 Provider API Key。

## 失败排查

- Provider 返回 `401` 通常表示外部 Provider Key 无效或缺失。
- `API key scope denied` 表示租户 Gateway API Key 缺少 `chat:completion` 或 `models:read`。
- 熔断失败状态可通过 `/api/providers/health` 查看。
- 支持日志中禁止加入完整客户 Prompt 和 Provider Key。
- 如果 Provider 探测成功但 Gateway Chat 失败，请检查模型状态、租户钱包余额、API Key scopes 和 `ai_usage_log`。
- 如果 Provider Health 仍为 `UNHEALTHY`，请根据最新 request id 查看 `provider_test_log` 中的脱敏错误。
