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
  "systemCode": "edms",
  "dataDomain": "document_text",
  "allowedDataDomains": "document_text,metadata",
  "agentCode": "support_agent",
  "promptTemplateCode": "support_summary",
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

## Agent Runtime Config

业务系统可以用自己的 Yeho API Key 按 `agent_code` 读取 Agent 配置和已发布 Prompt 模板，避免在 EDMS / EQMS / 机器人等系统里硬编码 Prompt。

```http
GET /api/v1/agent-runtime/configs/{agent_code}
Authorization: Bearer <yeho-api-key>
X-Yeho-System-Code: edms
X-Yeho-Data-Domain: document_text
```

权限要求：

- API Key 需要 `agent:read`、`chat:completion` 或 `admin:*` scope。
- 如果 API Key 配置了 `allowedSystemCodes` / `allowedDataDomains`，Header 必须匹配。
- Agent 配置中的 `systemCode` / `dataDomain` / `allowedDataDomains` 也会参与校验。

返回示例：

```json
{
  "code": 0,
  "message": "OK",
  "requestId": "req_xxx",
  "data": {
    "tenantId": "2058119168840212482",
    "systemCode": "edms",
    "dataDomain": "document_text",
    "allowedDataDomains": "document_text,metadata",
    "agentCode": "document_search",
    "promptTemplateCode": "edms_rag_answer_zh",
    "agentName": "EDMS 文档检索助手",
    "systemPrompt": "你是企业文档助手。",
    "defaultModel": "qwen-plus",
    "temperature": 0.2,
    "maxTokens": 2048,
    "status": "ACTIVE",
    "promptTemplate": {
      "id": "2059000000000000001",
      "templateCode": "edms_rag_answer_zh",
      "templateName": "EDMS 文档问答模板",
      "versionNo": 1,
      "content": "用户问题：{{question}}\n检索结果：{{contexts}}",
      "status": "PUBLISHED",
      "publishedAt": "2026-05-25T10:00:00"
    }
  },
  "timestamp": "2026-05-25T10:00:00"
}
```

Prompt 模板解析规则：

- 优先读取 Agent 配置里的 `promptTemplateCode`。
- 如果 `promptTemplateCode` 为空，则回退匹配 `templateCode = agentCode`。
- 只返回 `PUBLISHED` 状态模板；草稿不会暴露给业务系统。
- Yeho 只返回配置文本，不保存业务系统传入的文档、切片或向量。

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

When `/v1/chat/completions` is called with `X-Yeho-Agent-Code`, Yeho also writes an `agent_execute_log` row from the usage metadata. This lets business-system RAG calls appear in Agent Logs without storing Prompt原文、文档原文、切片或向量。

## Console Pages

- `/prompt-templates`
- `/agent-configs`
- `/agent-execute-logs`
