# Prompt and Agent Orchestration API

This module provides lightweight Prompt Template management, Agent Config management, and Agent Execute Log query APIs.

It does not implement complex Workflow Runtime, Tool Calling Runtime, multi-agent autonomy, centralized RAG, document storage, document chunks, or vector indexes.

## Prompt Templates

```http
GET /api/v1/prompt-templates?tenantId=1
Authorization: Bearer <console-token>
```

```http
POST /api/v1/prompt-templates
Content-Type: application/json
Authorization: Bearer <console-token>
```

```json
{
  "tenantId": 1,
  "templateCode": "support_summary",
  "templateName": "Support Summary",
  "description": "Summarize support cases.",
  "content": "Summarize the following case: {{case_content}}",
  "status": "DRAFT"
}
```

```http
PUT /api/v1/prompt-templates/{id}
POST /api/v1/prompt-templates/{id}/publish
DELETE /api/v1/prompt-templates/{id}
GET /api/v1/prompt-templates/{id}/versions
```

Publishing creates a `prompt_version` snapshot. Template content is configuration text only and must not be used to centrally store customer documents or RAG chunks.

## Agent Configs

```http
GET /api/v1/agent-configs?tenantId=1
Authorization: Bearer <console-token>
```

```http
POST /api/v1/agent-configs
Content-Type: application/json
Authorization: Bearer <console-token>
```

```json
{
  "tenantId": 1,
  "agentCode": "support_agent",
  "agentName": "Support Agent",
  "description": "Default customer service assistant.",
  "systemPrompt": "You are a concise enterprise support assistant.",
  "defaultModel": "qwen-plus",
  "temperature": 0.7,
  "maxTokens": 2048,
  "status": "ACTIVE"
}
```

```http
PUT /api/v1/agent-configs/{id}
DELETE /api/v1/agent-configs/{id}
```

This module only stores Agent configuration. It does not run autonomous multi-agent workflows.

## Agent Execute Logs

```http
GET /api/v1/agent-execute-logs?tenantId=1&requestId=req_xxx&traceId=trace_xxx
Authorization: Bearer <console-token>
```

Log records include:

- `request_id`
- `tenant_id`
- `agent_code`
- `model`
- `latency_ms`
- token usage
- credits
- success or error
- `trace_id`

Sensitive Prompt text and customer document content must not be recorded in `agent_execute_log`.

## Console Pages

- `/prompt-templates`
- `/agent-configs`
- `/agent-execute-logs`
