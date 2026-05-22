# Product Boundary

Yeho AI Platform is an enterprise AI Gateway / Billing / Audit / Agent Orchestration platform.

## Boundary Principle

**EDMS manages data. Yeho AI Platform manages AI capabilities.**

## Yeho AI Platform Owns

- Model invocation
- Model routing
- Provider Adapter abstraction
- Tenant and API Key management
- Wallet, credits, and billing records
- Token statistics
- Usage logs and audit logs
- Prompt and Agent orchestration
- Embedding API / RAG orchestration interface placeholders

## Yeho AI Platform Does Not Own

- Customer original documents
- Customer document chunks
- Customer vector indexes
- Centralized RAG knowledge storage
- Document permission filtering

## EDMS Owns

- Original document storage
- Document parsing and chunking
- Vector index storage
- RAG retrieval
- Document permission filtering

For RAG scenarios, EDMS returns permission-filtered retrieval results to Yeho AI Platform. The platform can orchestrate prompts and model calls, but must not persist customer knowledge content centrally.

## Infrastructure Implication

- PostgreSQL remains the platform business database for tenants, users, models, wallets, billing, API keys, usage logs, audit logs, and orchestration metadata.
- Redis remains the cache/token/session infrastructure.
- MinIO is optional and is not a first-stage core dependency.
- pgvector belongs to EDMS private deployments or future private knowledge-base components, not Yeho AI Platform centralized storage.
