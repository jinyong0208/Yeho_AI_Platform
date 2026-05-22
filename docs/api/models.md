# OpenAI-Compatible Models API

## List Models

```http
GET /v1/models
Authorization: Bearer <tenant_api_key>
```

This endpoint returns active models that can be routed by Yeho AI Platform.

Required API key scope:

- `models:read`
- or `admin:*`

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen-plus",
      "object": "model",
      "created": 1779428400,
      "owned_by": "QWEN"
    }
  ]
}
```

Error response:

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "param": "",
    "code": 401
  }
}
```

## Security Notes

- Requires a valid tenant API key.
- API keys are matched by hash only.
- Provider API keys are never returned.
- Internal prices, billing multipliers, provider base URLs, circuit state, and tenant wallet data are not exposed by this endpoint.
- This endpoint does not call model providers and does not write token usage logs.
