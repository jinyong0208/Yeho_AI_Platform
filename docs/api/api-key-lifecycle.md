# API Key Lifecycle API

These APIs are part of the MVP close-out scope for tenant API key operations.

They are admin-console APIs under `/api/**` and must be called with a signed console login token. They are not OpenAI-compatible public gateway APIs.

## Disable API Key

```http
POST /api/api-keys/{apiKeyId}/disable
```

Behavior:

- Sets `tenant_api_key.status` to `DISABLED`.
- Only operates on API keys owned by the current user's tenant.
- Does not delete the API key record.
- Does not expose the full API key.

Response:

```json
{
  "id": 2057485859733463041,
  "tenant_id": 2057485859385335809,
  "api_key_prefix": "sk-live",
  "name": "production gateway",
  "status": "DISABLED",
  "expired_at": null,
  "created_at": "2026-05-22T10:00:00",
  "last_used_at": "2026-05-22T10:12:00",
  "scopes": "chat:completion,models:read"
}
```

## Enable API Key

```http
POST /api/api-keys/{apiKeyId}/enable
```

Behavior:

- Sets `tenant_api_key.status` to `ACTIVE`.
- Only operates on API keys owned by the current user's tenant.
- Existing `expired_at` still applies; expired keys remain unusable by gateway authentication.

## Usage Summary

```http
GET /api/api-keys/{apiKeyId}/usage-summary?days=30
```

Response:

```json
{
  "apiKey": {
    "id": 2057485859733463041,
    "api_key_prefix": "sk-live",
    "name": "production gateway",
    "status": "ACTIVE",
    "scopes": "chat:completion,models:read"
  },
  "days": 30,
  "summary": {
    "request_count": 120,
    "input_tokens": 80000,
    "output_tokens": 24000,
    "total_tokens": 104000,
    "charge_credits": 5200,
    "real_cost": 12.35,
    "profit": 4.20,
    "success_count": 118,
    "failure_count": 2,
    "last_called_at": "2026-05-22T10:12:00"
  },
  "daily": [
    {
      "day": "2026-05-22",
      "request_count": 40,
      "total_tokens": 32000,
      "charge_credits": 1600,
      "success_count": 39,
      "failure_count": 1
    }
  ]
}
```

## Tenant Isolation

- The service resolves the current authenticated console user.
- It derives `tenant_id` from `tenant_user`.
- All lifecycle and usage queries filter by that tenant.
- Cross-tenant API key operations return `404` or `403`.

## Security Notes

- Full API keys are never returned.
- API key hashes are never returned.
- Usage summary does not include Prompt content.
- Existing audit middleware records backend lifecycle calls under `/api/**`.
