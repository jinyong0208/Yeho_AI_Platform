# Qwen Embedding 端到端测试

本冒烟测试验证真实 Qwen Embedding 通过 Yeho AI Platform 的完整链路：

- 加密保存的 Qwen Provider API Key。
- `text-embedding-v4` 模型路由。
- OpenAI-compatible `POST /v1/embeddings`。
- 带有 `embedding:create` scope 的租户 API Key。
- request id 回传。
- usage log 创建。

该测试不会持久化客户文档、文档切片或向量索引。返回的 embedding vector 只检查维度，不会打印向量内容。

## 密钥准备

在仓库外创建本地辅助文件：

```powershell
notepad C:\tmp\yeho-provider-secrets.ps1
```

预期格式：

```powershell
$env:QWEN_API_KEY="sk-..."
```

不要提交该文件，也不要把 Key 粘贴到日志、工单、截图或报告中。

## 运行方式

先启动平台，然后运行：

```powershell
. C:\tmp\yeho-provider-secrets.ps1
.\scripts\qwen-embedding-e2e.ps1
```

可选参数：

```powershell
.\scripts\qwen-embedding-e2e.ps1 `
  -PlatformBaseUrl "http://localhost:8080" `
  -TenantCode "default" `
  -Username "admin" `
  -Password "Admin@123456" `
  -ModelCode "text-embedding-v4"
```

## 预期结果

命令应返回类似下面的 JSON：

```json
{
  "providerCode": "QWEN",
  "modelCode": "text-embedding-v4",
  "status": 200,
  "vectorDimensions": 1024,
  "usageLogged": true
}
```

脚本会创建临时租户 API Key，并在验证结束后吊销。

## 排查建议

- `ProviderApiKey is required`：请先加载 `C:\tmp\yeho-provider-secrets.ps1`，或传入 `-ProviderApiKey`。
- `Model not found`：不要传 `-SkipModelEnsure`，让脚本自动创建或激活 `text-embedding-v4`。
- `401` 或 `403`：检查租户 API Key scope 是否包含 `embedding:create`。
- `502`：检查 Qwen Key 是否有效、Provider Base URL 是否正确，以及本机是否能访问外网。
