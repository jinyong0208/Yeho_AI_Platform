# OpenAI-Compatible Error Response

All public gateway APIs under `/v1/**` should return OpenAI-compatible error bodies.

Current endpoints:

- `POST /v1/chat/completions`
- `POST /v1/embeddings`
- `GET /v1/models`

## Error Body

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "param": null,
    "code": 401
  }
}
```

## Request ID

Gateway error responses include:

```http
X-Request-Id: <request-id>
```

If an upstream request ID already exists, it is reused. Otherwise the gateway generates one.

## Safety Rules

- Do not include full API keys in error responses.
- Do not include full prompts in error responses.
- Do not include provider API keys or decrypted secrets.
- Internal stack traces must not be returned to gateway clients.
