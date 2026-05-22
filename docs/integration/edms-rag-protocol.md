# EDMS RAG Integration Protocol

## Boundary

Yeho AI Platform does not centrally store customer documents, document chunks, or vector indexes.

EDMS private deployments own:

- Original document storage
- Document parsing and chunking
- Vector indexing
- RAG retrieval
- Document permission filtering

Yeho AI Platform owns:

- AI gateway requests
- Model routing
- Billing and credits
- Usage and audit logs
- Prompt and Agent orchestration
- Provider adapter integration

The integration rule is:

```text
EDMS manages data. Yeho AI Platform manages AI capabilities.
```

Yeho AI Platform consumes EDMS retrieval results through APIs only. It must not access the EDMS database directly.

## Retrieval Flow

```text
Business App / Agent
        |
        v
Yeho AI Platform
        |
        | retrieval request with tenant/user context
        v
EDMS Private Environment
        |
        | permission-filtered snippets
        v
Yeho AI Platform prompt / agent orchestration
        |
        v
Provider Adapter / Model Router
```

## Retrieval Request

EDMS should expose a retrieval endpoint for permission-filtered context.

```http
POST /api/ai/rag/retrieve
Content-Type: application/json
Authorization: Bearer <edms-service-token>
X-Request-Id: <request_id>
```

Request body:

```json
{
  "tenant_id": 1,
  "user_id": 1001,
  "query": "contract renewal policy",
  "top_k": 5,
  "filters": {
    "workspace_id": "edms-space-001",
    "document_types": ["contract", "policy"],
    "tags": ["renewal"]
  },
  "permission_context": {
    "roles": ["DOCUMENT_VIEWER"],
    "department_ids": ["dept-001"]
  }
}
```

Notes:

- `query` is used by EDMS for retrieval only.
- EDMS must apply document permissions before returning results.
- Yeho AI Platform must not persist the returned document text as centralized knowledge data.
- Yeho AI Platform may record request metadata, token usage, cost, latency, and audit events.

## Retrieval Response

```json
{
  "request_id": "req_01HX...",
  "tenant_id": 1,
  "items": [
    {
      "document_id": "doc_001",
      "chunk_id": "chunk_001",
      "title": "Contract Renewal Policy",
      "content": "Renewal notice must be submitted 30 days before expiration.",
      "score": 0.91,
      "source": {
        "system": "EDMS",
        "url": "https://edms.example.com/docs/doc_001"
      },
      "metadata": {
        "document_type": "policy",
        "updated_at": "2026-05-22T10:00:00Z"
      }
    }
  ]
}
```

Response rules:

- `content` must already be permission-filtered by EDMS.
- `document_id` and `chunk_id` are EDMS-owned identifiers.
- Yeho AI Platform may pass `content` into model context for the current orchestration request.
- Yeho AI Platform must not build a central vector index from these items.

## Permission Check

If EDMS separates permission filtering from retrieval, it may expose an explicit permission endpoint.

```http
POST /api/ai/rag/permissions/check
Content-Type: application/json
Authorization: Bearer <edms-service-token>
X-Request-Id: <request_id>
```

Request body:

```json
{
  "tenant_id": 1,
  "user_id": 1001,
  "document_ids": ["doc_001", "doc_002"],
  "action": "read"
}
```

Response body:

```json
{
  "request_id": "req_01HX...",
  "allowed_document_ids": ["doc_001"],
  "denied_document_ids": ["doc_002"]
}
```

Yeho AI Platform must treat EDMS as the source of truth for document permissions.

## Embedding API Usage

Yeho AI Platform may expose an OpenAI-compatible embedding API for EDMS to call:

```http
POST /v1/embeddings
Authorization: Bearer <yeho-api-key>
```

This API returns embeddings only. Yeho AI Platform must not store EDMS document vectors centrally.

## Audit Requirements

Yeho AI Platform should record:

- `request_id`
- `tenant_id`
- caller identity
- EDMS endpoint name
- model code if model calls are made
- latency
- token usage
- credits charged
- success or failure

Yeho AI Platform must not log complete customer documents or sensitive prompt content by default.

## Error Contract

EDMS should return standard errors:

```json
{
  "request_id": "req_01HX...",
  "error": {
    "code": "EDMS_PERMISSION_DENIED",
    "message": "The caller has no permission to access the requested documents."
  }
}
```

Recommended error codes:

- `EDMS_UNAUTHORIZED`
- `EDMS_PERMISSION_DENIED`
- `EDMS_RETRIEVAL_TIMEOUT`
- `EDMS_RETRIEVAL_FAILED`
- `EDMS_INVALID_REQUEST`

## Explicitly Forbidden

- Yeho AI Platform directly reading the EDMS database
- Yeho AI Platform centrally storing original documents
- Yeho AI Platform centrally storing document chunks
- Yeho AI Platform centrally storing customer vector indexes
- Yeho AI Platform replacing EDMS document permission filtering
