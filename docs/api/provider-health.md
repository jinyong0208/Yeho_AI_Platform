# Provider Health And Connection Test API

Provider health APIs are used by the admin console to verify model supplier connectivity.

These APIs never return provider API keys and must not log customer prompts. The probe request uses a fixed short `ping` message only.

## List Provider Health

```http
GET /api/providers/health
```

Response:

```json
[
  {
    "provider_id": 2057643291887177729,
    "provider_code": "QWEN",
    "provider_name": "Qwen",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "status": "ACTIVE",
    "health_status": "HEALTHY",
    "consecutive_failures": 0,
    "circuit_open_until": null,
    "last_checked_at": "2026-05-22T10:00:00",
    "last_test_request_id": "a6b28c6e-8f64-4a72-8d1c-8b46e75fbb76",
    "last_test_success": true,
    "last_test_latency_ms": 312,
    "last_test_error_code": null,
    "last_test_error_message": null,
    "last_tested_at": "2026-05-22T10:00:00"
  }
]
```

## Run Connection Test

```http
POST /api/providers/{providerId}/test
```

Behavior:

- Finds the first active model under the provider.
- Decrypts the provider API key in memory.
- Sends an OpenAI-compatible `chat/completions` probe with fixed content `ping`.
- Updates `ai_provider.health_status`, `consecutive_failures`, and `last_checked_at`.
- Writes one `provider_test_log` record.
- Returns `200` with `success=false` for provider-level failures so the console can render the result.

Success response:

```json
{
  "requestId": "a6b28c6e-8f64-4a72-8d1c-8b46e75fbb76",
  "providerId": 2057643291887177729,
  "providerCode": "QWEN",
  "providerName": "Qwen",
  "modelCode": "qwen-plus",
  "healthStatus": "HEALTHY",
  "success": true,
  "latencyMs": 312
}
```

Failure response:

```json
{
  "requestId": "a6b28c6e-8f64-4a72-8d1c-8b46e75fbb76",
  "providerId": 2057643291887177729,
  "providerCode": "QWEN",
  "providerName": "Qwen",
  "modelCode": "qwen-plus",
  "healthStatus": "UNHEALTHY",
  "success": false,
  "latencyMs": 245,
  "errorCode": "PROVIDER_TEST_FAILED",
  "errorMessage": "Provider request failed"
}
```

## Recent Test Logs

```http
GET /api/providers/{providerId}/test-logs
```

Response:

```json
[
  {
    "request_id": "a6b28c6e-8f64-4a72-8d1c-8b46e75fbb76",
    "success": false,
    "latency_ms": 245,
    "error_code": "PROVIDER_TEST_FAILED",
    "error_message": "Provider request failed",
    "tested_at": "2026-05-22T10:00:00"
  }
]
```

## Database

New table:

- `provider_test_log`

Updated table:

- `ai_provider.health_status`
- `ai_provider.consecutive_failures`
- `ai_provider.last_checked_at`

## Notes

- Provider API keys remain encrypted at rest.
- Full provider API keys are never returned by these APIs.
- Probe requests do not use tenant customer prompts or EDMS retrieval content.
