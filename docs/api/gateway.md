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
