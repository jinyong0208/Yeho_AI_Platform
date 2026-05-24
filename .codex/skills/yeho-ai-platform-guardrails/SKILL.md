---
name: yeho-ai-platform-guardrails
description: Use when working in Yeho AI Platform or related integration docs/code: AI Gateway, Billing, Audit, Runtime Console, Provider Adapter, API Key, tenants, wallets, usage logs, Prompt/Agent config, Workflow preview, EDMS/RAG/Qdrant/vector/voice/vision integration, or frontend UI changes.
---

# Yeho AI Platform Guardrails

## When To Use

Use this skill before changing Yeho AI Platform, especially when a task touches:

- AI Gateway, OpenAI-compatible API, Provider Adapter, model routing, provider health, rate limiting, API Key, scopes, tenants, wallet, credits, billing, audit, usage logs, runtime observability, Prompt Template, Agent Config, Agent Logs, Workflow preview.
- Frontend console pages, navigation, dashboard, i18n, UI copy, role-based UI, charts, tables, or product wording.
- EDMS, RAG, Embedding, Qdrant, pgvector, document data, chunks, vectors, permissions, voice, vision, or any business-system integration contract.

## First Checks

1. Read the project `AGENTS.md` first when it exists.
2. Reconcile the request with the latest user constraints in the thread.
3. Decide whether the task is inside the allowed product boundary:
   - Allowed: Gateway, Billing, Audit, Runtime Console, tenant/API Key, Provider Adapter, Prompt/Agent configuration, lightweight observability, integration protocols.
   - Restricted: Workflow may be preview/schema/UI only unless explicitly re-approved.
   - Forbidden by default: centralized documents, centralized chunks, centralized vector indexes, EDMS permission replacement, complex Agent runtime, complex Workflow runtime, low-code platform, Kubernetes, broad microservices.
4. Load only the relevant reference file:
   - `references/product-boundary.md`
   - `references/frontend-guidelines.md`
   - `references/api-and-security.md`
   - `references/business-system-data-standard.md`

## Core Rule

Yeho AI Platform manages capabilities. Business systems manage their own data.

- EDMS manages documents, chunks, vector indexes, RAG retrieval, and permission filtering.
- Other business systems manage their own text/audio/image/video/source data and vector stores.
- Yeho AI Platform only consumes sanitized context or calls external retrieval contracts.
- Do not add platform-central storage for customer documents, document chunks, or vector indexes.

## Implementation Guardrails

- Keep Java controllers thin. Put business logic in services and data access in Mapper/Repository.
- Keep DTO, VO, Entity, request, and response models separated.
- Enforce tenant isolation on all tenant data.
- Store tenant API Keys as hashes only. Show full keys only once at creation.
- Store Provider API Keys encrypted.
- Generate and propagate `request_id` for every gateway call.
- Write audit/usage logs for important operations and every AI request.
- Do not log full prompts, secrets, Provider keys, tenant API keys, or sensitive customer payloads.
- Keep wallet and credits operations transactional. Do not allow negative balances.
- Prefer focused, testable changes. Avoid unrelated rewrites and whole-repo formatting.
- Update docs whenever a module or integration contract changes.

## Frontend Guardrails

- UI direction: modern Enterprise AI Runtime Console, not ERP/OA.
- Use React, Vite, TypeScript, Mantine, TanStack Query, Axios, Zustand, React Router, i18next, Dayjs, Mantine Charts, Tabler Icons.
- Do not use Ant Design, Ant Design Pro, ProComponents, Umi, dva, qiankun, or OnlyOffice editor.
- Default language is `zh-CN`.
- All UI copy must go through i18next. Do not hardcode product UI strings in pages.
- English technical terms that may remain in Chinese UI: API, API Key, Credits, Prompt, Agent, Workflow, Playground, Provider, Runtime, Token.
- Keep Workflow low exposure as `Workflow (Preview)` and state that runtime is not enabled.

## Output Expectations

For completed development work, report only the useful project-facing facts:

- Modified files
- New tables, interfaces, or pages
- How to run and test
- Known issues
- Next recommended step

Keep the response concise and in Chinese unless the user asks otherwise.

