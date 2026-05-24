# Yeho AI Platform Product Boundary

## Positioning

Yeho AI Platform is an enterprise AI Gateway / Billing / Audit / Runtime / Agent Orchestration platform.

It is not:

- A centralized document platform
- A centralized knowledge base
- A centralized RAG/vector platform
- An OnlyOffice/document editing platform
- A low-code platform
- A complex Workflow runtime
- A multi-agent autonomous runtime

## Ownership Boundary

Core principle:

```text
EDMS and business systems manage data.
Yeho AI Platform manages capabilities.
```

Yeho AI Platform may manage:

- Model calls
- Model routing
- Provider Adapter configuration
- Tenant and API Key
- API Key scope
- Wallet, credits, billing, recharge records, invoice records
- Token usage and cost/profit analytics
- Gateway audit and request traces
- Prompt Template and Prompt Version
- Agent Config and Agent Execute Log
- Embedding API contract
- RAG orchestration contract
- Provider health, circuit breaker, rate limit

Yeho AI Platform must not centrally store:

- Customer complete documents
- Document chunks
- Customer vector indexes
- EDMS permission models
- Business-system source audio/image/video files unless explicitly re-approved for a separate storage product

## RAG And Vector Boundary

EDMS/private business systems own:

- Source documents and files
- Chunking
- Embedding jobs
- Qdrant/pgvector/vector index deployment
- Retrieval
- Permission filtering
- Context sanitization

Yeho AI Platform may:

- Provide `/v1/embeddings`
- Provide `/v1/chat/completions`
- Define retrieval protocol and payload contracts
- Receive retrieved context from EDMS/business systems
- Audit model calls and token/credit usage

Yeho AI Platform must not:

- Directly query EDMS database
- Replace EDMS permission filtering
- Persist retrieved customer knowledge as a central knowledge base
- Build a centralized vector-store management UI in the MVP

## MVP Scope Guardrail

Allowed MVP hardening priorities:

- API Key lifecycle
- OpenAI-compatible error body
- Provider real end-to-end calls
- Wallet operation closure
- Cost price versioning
- Multi-tenant isolation tests
- Deployment docs
- Role-based navigation
- Provider health
- Rate limit
- Billing and provider analytics
- Prompt template management
- Agent config/log management

Do not expand into:

- Complex Agent runtime
- Tool runtime
- Autonomous Agent
- Complex Workflow runtime
- Workflow node execution
- Loop nodes
- Multi-agent graphs
- Centralized RAG
- Centralized vector knowledge base

