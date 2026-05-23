# Qwen Embedding E2E

This smoke verifies the real Qwen embedding path through Yeho AI Platform:

- encrypted Qwen Provider API key
- `text-embedding-v4` model routing
- OpenAI-compatible `POST /v1/embeddings`
- `embedding:create` scoped tenant API key
- request id echo
- usage log creation

It does not persist customer documents, document chunks, or vector indexes. The returned embedding vector is only inspected for dimension count and is not printed.

## Secret Setup

Use a local helper file outside the repository:

```powershell
notepad C:\tmp\yeho-provider-secrets.ps1
```

Expected format:

```powershell
$env:QWEN_API_KEY="sk-..."
```

Do not commit this file or paste the key into logs, tickets, screenshots, or reports.

## Run

Start the platform first, then run:

```powershell
. C:\tmp\yeho-provider-secrets.ps1
.\scripts\qwen-embedding-e2e.ps1
```

Optional parameters:

```powershell
.\scripts\qwen-embedding-e2e.ps1 `
  -PlatformBaseUrl "http://localhost:8080" `
  -TenantCode "default" `
  -Username "admin" `
  -Password "Admin@123456" `
  -ModelCode "text-embedding-v4"
```

## Expected Result

The command should return JSON similar to:

```json
{
  "providerCode": "QWEN",
  "modelCode": "text-embedding-v4",
  "status": 200,
  "vectorDimensions": 1024,
  "usageLogged": true
}
```

The script creates a temporary tenant API key and revokes it after validation.

## Troubleshooting

- `ProviderApiKey is required`: source `C:\tmp\yeho-provider-secrets.ps1` or pass `-ProviderApiKey`.
- `Model not found`: run without `-SkipModelEnsure` so the script can create/activate `text-embedding-v4`.
- `401` or `403`: check tenant API key scope includes `embedding:create`.
- `502`: check Qwen key validity, provider base URL, and outbound network access.
