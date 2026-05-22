# AI Gateway API

## POST /v1/chat/completions

OpenAI-compatible chat completions endpoint.

### Headers

```http
Authorization: Bearer yh_sk_demo_default_key
Content-Type: application/json
```

### Request

```json
{
  "model": "deepseek-chat",
  "messages": [
    { "role": "user", "content": "Hello gateway" }
  ],
  "temperature": 0.7,
  "max_tokens": 64,
  "stream": false
}
```

### Response

```json
{
  "id": "chatcmpl-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "object": "chat.completion",
  "created": 1779415377,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 13,
    "completion_tokens": 46,
    "total_tokens": 59
  }
}
```

### Supported Fields

- `model`
- `messages`
- `temperature`
- `max_tokens`
- `stream=false`
- `stream=true`

### Streaming Response

When `stream` is `true`, the endpoint returns `text/event-stream` using OpenAI-compatible chunks:

```text
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1779415377,"model":"deepseek-chat","choices":[{"index":0,"delta":{"role":"assistant"}}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1779415377,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1779415377,"model":"deepseek-chat","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

Streaming calls still reserve credits, settle actual credits after completion, and write `ai_usage_log`.

### Error Shape

Errors use the OpenAI-compatible `error` envelope.

## Provider Management

Provider management APIs are console APIs under `/api/v1/providers` and require `SUPER_ADMIN`.

### PUT /api/v1/providers/{id}/api-key

Updates the provider API key without returning plaintext secrets.

```json
{
  "apiKey": "sk-xxxxxxxx"
}
```

Response uses the normal provider shape and only returns `hasApiKey`.

### POST /api/v1/providers/{id}/test

Runs a lightweight non-streaming chat request through the configured `AiProviderAdapter`. Business code must not call provider SDKs directly.

```json
{
  "model": "deepseek-chat",
  "message": "ping"
}
```

Both fields are optional. When `model` is omitted, the backend picks the first active model under the provider.

```json
{
  "providerId": 1,
  "providerCode": "DEEPSEEK",
  "modelCode": "deepseek-chat",
  "success": true,
  "code": "ok",
  "message": "Provider connection succeeded",
  "latencyMs": 120,
  "testedAt": "2026-05-22T14:20:00"
}
```
