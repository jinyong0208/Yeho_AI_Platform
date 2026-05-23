# Backend Regression Tests

The MVP closeout backend tests focus on rules that must not regress:

- API key scope parsing and authorization.
- Tenant access boundaries.
- OpenAI-compatible error envelope.
- Wallet credit reservation, settlement, and insufficient-balance handling.
- Provider retry, circuit breaker, fallback, and rate-limit rollback behavior.
- OpenAI-compatible endpoint filters for chat preflight, models, and embeddings.

Run from `apps/platform`:

```powershell
mvn test
```

Run only the closeout regression set:

```powershell
mvn "-Dtest=ApiKeyScopeServiceTest,TenantAccessServiceTest,OpenAiErrorResponseWriterTest,OpenAiEndpointFilterTest,AiWalletServiceTest,AiGatewayServiceTest,ProviderCircuitBreakerServiceTest,RateLimitServiceTest" test
```

Run through Docker Compose when local Java or Maven is unavailable:

```powershell
docker compose -f docker-compose.test.yml build platform-test
```

These tests are intentionally service-level unit tests. They do not require PostgreSQL, Redis, Provider API keys, or customer data.

The broader Compose smoke tests remain:

```powershell
.\scripts\smoke-all.ps1
.\scripts\smoke-mvp-closeout.ps1
.\scripts\smoke-gateway-integration.ps1
.\scripts\smoke-rate-limit-hardening.ps1
.\scripts\regression-openai-errors.ps1
```

`smoke-gateway-integration.ps1` is the local black-box gateway integration check. It configures DeepSeek and Qwen to the local mock provider, creates temporary tenant API keys, and verifies:

- `/v1/chat/completions` success path.
- Wallet balance decreases and wallet `SETTLE` log uses the same `request_id`.
- `ai_usage_log` records chat success with token usage and charge credits.
- `/v1/embeddings` rejects keys without `embedding:create`.
- `/v1/embeddings` success path records usage with the caller `X-Request-Id`.
- API-key RPM limit returns OpenAI-compatible `429 rate_limit_rpm_exceeded`.

`smoke-rate-limit-hardening.ps1` adds endpoint-level checks for:

- TPM rejection with `rate_limit_tpm_exceeded`.
- Max-concurrency rejection with `rate_limit_concurrent_exceeded`.

`regression-openai-errors.ps1` checks OpenAI-compatible error envelopes and `X-Request-Id` for:

- `/v1/models` missing auth.
- `/v1/chat/completions` missing auth.
- `/v1/embeddings` missing auth.
- `/v1/models` invalid key.
- `/v1/chat/completions` scope denial with a temporary `models:read`-only API key.

## Current Coverage

`ApiKeyScopeServiceTest`:

- Default scope is `chat:completion`.
- Scopes are trimmed, sorted, and deduplicated.
- Exact scopes and `admin:*` are allowed.
- Missing scopes return gateway `403 insufficient_scope`.
- Null API keys return gateway `401 invalid_api_key`.

`TenantAccessServiceTest`:

- `SUPER_ADMIN` can access any tenant.
- Tenant users are scoped to their own tenant.
- Cross-tenant access is denied.
- Anonymous access is denied.

`OpenAiErrorResponseWriterTest`:

- Error body follows the OpenAI-compatible `error` envelope.
- Blank messages fall back to the HTTP reason phrase.
- `X-Request-Id` is preserved.
- `param` is emitted as JSON `null`.

`AiWalletServiceTest`:

- Credit charge calculation uses input/output rates, multiplier, and ceiling rounding.
- Reserve rejects insufficient credits without mutating wallet or logs.
- Reserve moves credits from balance to frozen and writes a wallet log.
- Settlement releases unused credits and records actual usage.
- Settlement rejects underestimated charges when top-up balance is insufficient.

`AiGatewayServiceTest`:

- Fallback route success uses the fallback provider/model for response, billing, and usage log.
- Rate-limit rejection before wallet reservation does not release unfrozen credits.

`RateLimitServiceTest`:

- Redis counters are rolled back when rate-limit checks reject a request.
- Audit-log failures do not suppress the original `429` gateway error.

`ProviderCircuitBreakerServiceTest`:

- Retry succeeds on a later attempt and records provider recovery.
- Failure threshold opens the circuit.
- Cooling-down providers are rejected.
- Success clears previous circuit state.
