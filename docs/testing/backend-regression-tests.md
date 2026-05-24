# 后端回归测试

MVP 收口阶段的后端测试重点是防止以下核心规则回退：

- API Key scope 解析与授权。
- 租户访问边界。
- OpenAI-compatible 错误响应结构。
- 钱包 Credits 预冻结、结算和余额不足处理。
- Provider 重试、熔断、fallback，以及限流回滚行为。
- Chat、Models、Embeddings 等 OpenAI-compatible 端点的前置过滤逻辑。

## 运行全部后端测试

在 `apps/platform` 目录执行：

```powershell
mvn test
```

## 只运行收口回归测试集

```powershell
mvn "-Dtest=ApiKeyScopeServiceTest,TenantAccessServiceTest,OpenAiErrorResponseWriterTest,OpenAiEndpointFilterTest,AiWalletServiceTest,AiGatewayServiceTest,ProviderCircuitBreakerServiceTest,RateLimitServiceTest" test
```

## 通过 Docker Compose 运行

当本机 Java 或 Maven 不可用时，可以通过 Docker Compose 构建测试镜像：

```powershell
docker compose -f docker-compose.test.yml build platform-test
```

这些测试刻意保持在 Service 级单元测试范围内，不依赖 PostgreSQL、Redis、Provider API Key 或客户数据。

## 相关冒烟测试

更完整的 Compose 冒烟测试包括：

```powershell
.\scripts\smoke-all.ps1
.\scripts\smoke-mvp-closeout.ps1
.\scripts\smoke-gateway-integration.ps1
.\scripts\smoke-rate-limit-hardening.ps1
.\scripts\regression-openai-errors.ps1
```

`smoke-gateway-integration.ps1` 是本地黑盒网关集成测试。它会把 DeepSeek 和 Qwen 配置到本地 mock provider，创建临时租户 API Key，并验证：

- `/v1/chat/completions` 成功链路。
- 钱包余额扣减，且钱包 `SETTLE` 流水使用同一个 `request_id`。
- `ai_usage_log` 记录 chat 成功、token 用量和扣费 Credits。
- `/v1/embeddings` 会拒绝缺少 `embedding:create` scope 的 API Key。
- `/v1/embeddings` 成功链路会使用调用方传入的 `X-Request-Id` 记录 usage log。
- API Key 级 RPM 限流返回 OpenAI-compatible 的 `429 rate_limit_rpm_exceeded`。

`smoke-rate-limit-hardening.ps1` 额外验证：

- TPM 超限返回 `rate_limit_tpm_exceeded`。
- 最大并发超限返回 `rate_limit_concurrent_exceeded`。

`regression-openai-errors.ps1` 验证 OpenAI-compatible 错误响应和 `X-Request-Id`：

- `/v1/models` 缺少鉴权。
- `/v1/chat/completions` 缺少鉴权。
- `/v1/embeddings` 缺少鉴权。
- `/v1/models` 使用无效 API Key。
- 临时 `models:read` only API Key 调用 `/v1/chat/completions` 被 scope 拒绝。

## 当前覆盖范围

`ApiKeyScopeServiceTest`：

- 默认 scope 为 `chat:completion`。
- scopes 会 trim、排序并去重。
- 精确 scope 和 `admin:*` 可以通过授权。
- 缺少 scope 时返回网关 `403 insufficient_scope`。
- 空 API Key 返回网关 `401 invalid_api_key`。

`TenantAccessServiceTest`：

- `SUPER_ADMIN` 可以访问任意租户。
- 租户用户只能访问自己的租户。
- 跨租户访问会被拒绝。
- 匿名访问会被拒绝。

`OpenAiErrorResponseWriterTest`：

- 错误体符合 OpenAI-compatible 的 `error` envelope。
- 空错误消息会回退为 HTTP reason phrase。
- `X-Request-Id` 会被保留。
- `param` 会以 JSON `null` 输出。

`AiWalletServiceTest`：

- Credits 扣费计算使用 input/output rate、multiplier 和向上取整。
- 余额不足时拒绝预冻结，且不改动钱包和流水。
- 预冻结会把 Credits 从 balance 转入 frozen，并写钱包流水。
- 结算会释放未使用的冻结 Credits，并记录实际用量。
- 当预估扣费不足且追加扣费余额不足时，结算会拒绝。

`AiGatewayServiceTest`：

- fallback 成功时，响应、计费和 usage log 使用 fallback provider/model。
- 钱包预冻结前发生限流拒绝时，不会释放未冻结的 Credits。

`RateLimitServiceTest`：

- 限流检查拒绝请求时会回滚 Redis 计数器。
- 审计日志写入失败不会吞掉原始的 `429` 网关错误。

`ProviderCircuitBreakerServiceTest`：

- 重试在后续尝试成功时会记录 Provider 恢复。
- 达到失败阈值会打开熔断。
- 处于冷却期的 Provider 会被拒绝。
- 成功调用会清理之前的熔断状态。
