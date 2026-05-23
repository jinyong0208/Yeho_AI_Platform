# Rate Limit Hardening Smoke

This smoke verifies endpoint-level gateway rejection for:

- TPM (`rate_limit_tpm_exceeded`)
- Max Concurrent (`rate_limit_concurrent_exceeded`)

The script configures the local mock provider, creates temporary tenant API keys, applies API key-level limits, calls `POST /v1/chat/completions`, checks OpenAI-compatible `429` errors, verifies usage-log error codes, and revokes the temporary API keys.

## Run

Start or rebuild the platform first:

```powershell
docker compose build --progress plain platform
docker compose up -d platform
```

Then run:

```powershell
.\scripts\smoke-rate-limit-hardening.ps1
```

## Expected Result

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

## Notes

The max-concurrency check uses the local mock provider delay marker `[mock-delay-ms=3000]`. This marker exists only for `/mock-provider/v1` smoke testing and is not part of the real provider adapter path.
