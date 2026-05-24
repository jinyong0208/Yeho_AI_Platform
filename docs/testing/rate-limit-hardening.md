# 限流强化冒烟测试

本冒烟测试验证网关端点级拒绝逻辑：

- TPM：`rate_limit_tpm_exceeded`
- 最大并发：`rate_limit_concurrent_exceeded`

脚本会配置本地 mock provider，创建临时租户 API Key，应用 API Key 级限流配置，调用 `POST /v1/chat/completions`，检查 OpenAI-compatible 的 `429` 错误，验证 usage log 错误码，并吊销临时 API Key。

## 运行方式

先启动或重建 Platform：

```powershell
docker compose build --progress plain platform
docker compose up -d platform
```

然后运行：

```powershell
.\scripts\smoke-rate-limit-hardening.ps1
```

## 预期结果

```json
{
  "tpm": {
    "status": 429,
    "errorCode": "rate_limit_tpm_exceeded"
  },
  "concurrent": {
    "firstStatus": 200,
    "secondStatus": 429,
    "errorCode": "rate_limit_concurrent_exceeded"
  }
}
```

## 说明

最大并发测试使用本地 mock provider 延迟标记 `[mock-delay-ms=3000]`。该标记只用于 `/mock-provider/v1` 冒烟测试，不属于真实 Provider Adapter 链路。
