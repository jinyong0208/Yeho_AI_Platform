# MVP 收口冒烟测试

本冒烟测试覆盖 MVP 收口阶段的核心能力，不新增 Agent Workflow、中心化 RAG、文档存储或向量存储。

## 测试范围

脚本会验证：

- Platform 健康检查和 admin 登录。
- `/v1/models` 的 OpenAI-compatible 错误响应结构。
- 公共网关错误中的 `X-Request-Id`。
- API Key 创建、禁用、启用、用量汇总和吊销。
- `models:read` 的 API Key scope。
- API Key 生命周期接口和控制台 API Key 列表的跨租户拒绝。
- 钱包低余额告警查询。
- Model 价格版本列表。
- Provider Health 列表。
- 可选的真实 Provider 连通性测试。

脚本会创建临时租户、用户和 API Key，并在清理阶段删除或吊销。

## 运行方式

先启动平台：

```powershell
docker compose up -d postgres redis agent platform
```

运行冒烟测试：

```powershell
.\scripts\smoke-mvp-closeout.ps1
```

使用自定义 admin 登录信息：

```powershell
.\scripts\smoke-mvp-closeout.ps1 `
  -PlatformBaseUrl "http://localhost:8080" `
  -TenantCode "default" `
  -Username "admin" `
  -Password "Admin@123456"
```

## 真实 Provider 探测

配置真实 Provider API Key 后运行：

```powershell
.\scripts\smoke-mvp-closeout.ps1 `
  -RunProviderTest `
  -ProviderCode "QWEN" `
  -RequireProviderSuccess
```

也可以通过 Provider ID 运行：

```powershell
.\scripts\smoke-mvp-closeout.ps1 `
  -RunProviderTest `
  -ProviderId 2057643291887177729 `
  -RequireProviderSuccess
```

如果 Provider 账号尚未配置，请不要传 `-RunProviderTest`。基础收口冒烟测试仍会验证网关、计费、钱包、价格版本和租户隔离链路。

## 预期输出

脚本会输出类似下面的 JSON 汇总：

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

`tenantIsolationConsoleStatus` 只要求是非 2xx。`403`、`404`，或当前全局业务错误映射都可以接受；关键要求是跨租户访问不能成功。

## 安全说明

- 脚本不会打印完整 Provider API Key。
- 临时 Gateway API Key 只在测试过程中保留在内存中。
- 测试 Prompt 范围限制在 `/v1/models`，不会向模型发送客户 Prompt。
- 不会创建客户文档、文档切片或向量索引。
