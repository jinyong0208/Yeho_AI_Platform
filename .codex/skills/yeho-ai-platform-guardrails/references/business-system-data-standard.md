# Business-System AI Data Standard

Use this reference when adding docs or integration contracts for EDMS or any other business system that wants to use Yeho AI Platform.

Authoritative local doc:

```text
docs/integration/business-system-ai-capability-standard.md
```

## Boundary

Business systems own:

- Source text, documents, forms, records, audio, images, video, and telemetry
- Chunking and preprocessing
- Local Qdrant/pgvector/vector indexes
- Permission filtering
- RAG retrieval
- Domain-specific retention and deletion

Yeho AI Platform owns:

- Model Gateway
- Provider routing
- API Key and scopes
- Credits and billing
- Token statistics
- Audit
- Prompt/Agent configuration
- Embedding API contract
- RAG orchestration contract

## Qdrant Guidance

Qdrant can be recommended for local/private business-system deployment.

Yeho AI Platform should specify requirements, not own deployment:

- Collection names should be business-system scoped.
- Payload must contain tenant, source, document/resource identifiers, chunk identifiers, permission metadata, timestamps, and content hash.
- Vectors must not be uploaded to Yeho as central storage.
- Retrieval results sent to Yeho must be permission-filtered and minimized.

Suggested payload fields:

```json
{
  "tenant_id": "tnt_xxx",
  "source_system": "edms",
  "resource_type": "document",
  "resource_id": "doc_123",
  "chunk_id": "chunk_001",
  "title": "安全操作规程",
  "permission_scope": ["dept:quality", "role:auditor"],
  "content_hash": "sha256:...",
  "metadata": {
    "version": "v3",
    "language": "zh-CN"
  },
  "created_at": "2026-05-24T09:00:00+08:00",
  "updated_at": "2026-05-24T09:00:00+08:00"
}
```

## Retrieval Contract

Business systems should call Yeho only after local retrieval and permission filtering.

The context sent to Yeho should be:

- Minimal
- Permission-filtered
- Traceable by source and chunk IDs
- Free of unnecessary raw documents or oversized payloads

## Voice And Vision

For voice/vision integrations:

- Business systems own media storage and preprocessing.
- Yeho may provide gateway calls, prompt/agent configuration, billing, audit, and model routing.
- Do not centralize customer media assets in Yeho during MVP.
- Use signed URLs or business-system callback contracts when media transfer is unavoidable.

## Forbidden

Do not implement in Yeho without explicit product re-approval:

- Central document repository
- Central chunk repository
- Central vector store
- EDMS database access
- EDMS permission engine replacement
- Business-system media storage product
- RAG admin UI that manages customer vectors centrally

