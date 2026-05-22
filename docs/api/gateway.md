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

### Error Shape

Errors use the OpenAI-compatible `error` envelope.

