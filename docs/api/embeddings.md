# Embeddings API

Yeho AI Platform provides an OpenAI-compatible Embeddings API for EDMS and other business systems.

This endpoint only routes model calls and returns embedding vectors. It must not centrally store customer documents, document chunks, or vector indexes.

## Endpoint

```http
POST /v1/embeddings
Authorization: Bearer <tenant-api-key>
Content-Type: application/json
```

Request:

```json
{
  "model": "text-embedding-v4",
  "input": [
    "EDMS handles document storage, chunking, vector indexes, retrieval, and permission filtering."
  ],
  "encoding_format": "float"
}
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.0123, -0.0456],
      "index": 0
    }
  ],
  "model": "text-embedding-v4",
  "usage": {
    "prompt_tokens": 12,
    "total_tokens": 12
  }
}
```

## Scope

API Keys must include one of:

- `embedding:create`
- `admin:*`

The migration `V10__enable_embedding_scope.sql` adds `embedding:create` to existing API Keys and to the default scope set.

## Provider Support

Current first implementation:

- Qwen-compatible embedding endpoint

Configuration:

- Configure Qwen Provider base URL in `ai_provider.base_url`.
- Configure Provider API Key through the Provider API Key management endpoint.
- Use model code `text-embedding-v4` or another active model mapped to Provider `QWEN`.
- Run `scripts/qwen-embedding-e2e.ps1` for real provider validation.

## Boundary

Allowed:

- Route embedding requests to Provider Adapter
- Return embeddings to caller
- Record usage metadata

Forbidden:

- Store original documents
- Store document chunks
- Store customer vector indexes
- Replace EDMS retrieval or permission filtering
