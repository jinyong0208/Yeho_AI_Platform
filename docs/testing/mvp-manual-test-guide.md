# MVP 手工测试指南

本文档用于 MVP Hardening 完成后的本地手工验收。

产品边界保持不变：

- EDMS 负责文档原文、切片、向量索引、RAG 检索和权限过滤。
- Yeho AI Platform 负责 Gateway、Billing、Audit、租户、API Key、Provider Adapter、Prompt/Agent 配置和 Runtime Observability。
- 本平台测试中不要创建中心化文档存储、中心化向量库或 OnlyOffice 流程。

## 1. 启动平台

在项目根目录执行：

```powershell
docker compose up -d postgres redis agent platform web
```

查看容器：

```powershell
docker ps
```

预期能看到以下 Yeho 服务：

- `yeho-ai-postgres`
- `yeho-ai-redis`
- `yeho-ai-agent`
- `yeho-ai-platform`
- `yeho-ai-web`

健康检查：

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
Invoke-RestMethod http://localhost:8000/api/v1/health
```

## 2. 打开控制台

浏览器访问：

```text
http://127.0.0.1:5173/login
```

本地默认登录信息：

```text
Tenant Code: default
Username: admin
Password: Admin@123456
```

登录后，`SUPER_ADMIN` 菜单应包含：

- Dashboard
- 租户管理
- 用户管理
- Provider Health
- Provider 管理
- 限流配置
- API Key Scope
- Provider Analytics
- Billing Analytics
- 全局审计
- Workflow (Preview)

## 3. 用户管理检查

打开：

```text
用户管理
```

验证：

- `SUPER_ADMIN` 可以进入用户管理页面。
- 如果没有租户，页面显示“请先创建租户”。
- 已选择租户时，点击“新建”可以在该租户下创建用户。
- 创建用户时可以选择 `TENANT_ADMIN`、`DEVELOPER`、`FINANCE`、`VIEWER`。
- 默认角色不能固定为 `VIEWER`。

## 4. Provider 配置检查

打开：

```text
Provider Health
```

验证：

- Provider 卡片显示健康状态。
- 卡片显示 timeout 和 retry 标签。
- 点击“配置”。
- 弹窗显示 Base URL、状态、timeout、retry、熔断阈值、冷却时间和 fallback model。
- 保存弹窗应调用 `/api/v1/providers/{id}`。
- Provider API Key 轮换是单独入口，现有密钥绝不能被页面回显。

## 5. Provider 密钥文件格式

真实 Provider Key 必须放在 Git 仓库外。本地 PowerShell 测试可使用：

```powershell
$env:DEEPSEEK_API_KEY = "replace-with-deepseek-key"
$env:QWEN_API_KEY = "replace-with-qwen-key"
```

加载示例：

```powershell
. C:\tmp\yeho-provider-secrets.ps1
```

不要把真实 Key 粘贴到文档、Git commit、控制台日志或截图中。

## 6. 核心冒烟测试

运行：

```powershell
.\scripts\smoke-mvp-closeout.ps1
```

覆盖范围：

- Platform 健康检查。
- Console 登录 token。
- OpenAI-compatible 错误响应。
- API Key 生命周期。
- API Key scope。
- 租户隔离。
- 钱包低余额查询。
- Model 价格版本。
- Provider Health 列表。

## 7. 真实 Provider Chat 测试

加载真实 Key 后运行 Provider E2E 脚本。

Qwen：

```powershell
. C:\tmp\yeho-provider-secrets.ps1
.\scripts\provider-e2e.ps1 -ProviderCode "QWEN"
```

DeepSeek：

```powershell
. C:\tmp\yeho-provider-secrets.ps1
.\scripts\provider-e2e.ps1 -ProviderCode "DEEPSEEK"
```

预期：

- `/v1/chat/completions` 返回 HTTP 200。
- 响应结构兼容 OpenAI。
- `ai_usage_log` 写入本次请求。
- 钱包余额和钱包流水反映本次扣费。

## 8. Qwen Embedding 预留接口测试

Embedding 只作为 EDMS 或后续私有知识库场景预留。平台不保存向量。

运行：

```powershell
. C:\tmp\yeho-provider-secrets.ps1
.\scripts\qwen-embedding-e2e.ps1
```

预期：

- `/v1/embeddings` 返回 HTTP 200。
- 返回 Qwen embedding 维度。
- 写入 usage log。
- 不创建中心化向量索引或文档切片。

## 9. 限流强化测试

运行：

```powershell
.\scripts\smoke-rate-limit-hardening.ps1
```

预期：

- TPM 超限返回 HTTP 429，错误码为 `rate_limit_tpm_exceeded`。
- 并发超限返回 HTTP 429，错误码为 `rate_limit_concurrent_exceeded`。
- 审计和 usage 记录保留 request ID。

## 10. 前端构建验证

运行：

```powershell
cd apps\web
npm run build
```

预期：

- TypeScript 构建通过。
- Vite 生产构建通过。

## 11. 后端回归测试

运行：

```powershell
cd apps\platform
mvn test
```

预期：

- 后端测试全部通过。

## 12. 已知说明

- 真实 Provider 测试需要有效的 DeepSeek 或 Qwen 账号密钥，并需要可访问外网。
- `C:\tmp\yeho-provider-secrets.ps1` 仅供本地使用，验证结束后建议删除或妥善保护。
- MinIO 是可选组件，不是 MVP AI Gateway 测试必需项。
- Workflow 当前仅为 Preview，不启用 Runtime Engine。
- 中心化 RAG、客户文档存储、文档切片和向量索引均刻意不在本平台范围内。
