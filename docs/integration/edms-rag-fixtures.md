# EDMS RAG Protocol Fixtures

These fixtures are examples for integration testing between EDMS private deployments and Yeho AI Platform.

Yeho AI Platform must only consume the returned retrieval context for orchestration. It must not persist customer documents, document chunks, or vector indexes.

## Retrieval Request

```json
{
  "request_id": "req_202605220001",
  "tenant_id": "tenant_default",
  "caller": {
    "system": "yeho-ai-platform",
    "user_id": "10001",
    "roles": ["DEVELOPER"]
  },
  "query": "Summarize the latest quality procedure for supplier onboarding.",
  "filters": {
    "repository": "eqms",
    "document_types": ["procedure", "policy"],
    "top_k": 5
  }
}
```

## Retrieval Response

```json
{
  "request_id": "req_202605220001",
  "tenant_id": "tenant_default",
  "success": true,
  "items": [
    {
      "source_id": "edms_doc_10086",
      "source_title": "Supplier Onboarding Procedure",
      "source_uri": "edms://documents/edms_doc_10086",
      "chunk_id": "chunk_0007",
      "content": "Approved suppliers must complete qualification review before purchase order creation.",
      "score": 0.91,
      "metadata": {
        "version": "v3",
        "owner_department": "Quality",
        "updated_at": "2026-05-01T08:30:00Z"
      }
    }
  ],
  "permission_result": {
    "filtered_by_edms": true,
    "visible_count": 1,
    "denied_count": 0
  }
}
```

## Permission Check Request

```json
{
  "request_id": "req_202605220002",
  "tenant_id": "tenant_default",
  "user_id": "10001",
  "resource_refs": [
    {
      "source_id": "edms_doc_10086",
      "chunk_id": "chunk_0007"
    }
  ],
  "action": "read"
}
```

## Permission Check Response

```json
{
  "request_id": "req_202605220002",
  "tenant_id": "tenant_default",
  "results": [
    {
      "source_id": "edms_doc_10086",
      "chunk_id": "chunk_0007",
      "allowed": true,
      "reason": "role_policy_matched"
    }
  ]
}
```

## Platform Handling Rules

- Do not write `content` into Yeho AI Platform tables.
- Do not write `chunk_id` plus vector data into Yeho AI Platform tables.
- Do not bypass EDMS permission filtering.
- Usage logs may store request metadata, token counts, latency, provider, model, tenant, and billing data.
- Prompt and trace logs must avoid storing sensitive retrieved content by default.
