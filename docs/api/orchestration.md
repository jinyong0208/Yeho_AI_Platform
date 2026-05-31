# Prompt / Agent / Workflow 编排 API

本文档描述 Yeho AI Platform 第一阶段的轻量编排能力。

当前边界：

- Yeho 只保存 Prompt、Agent、Workflow 的配置和版本。
- Yeho 不保存客户完整文档、文档切片或向量索引。
- Yeho 不执行复杂 Workflow Runtime、Tool Runtime、多 Agent 自治或中心化 RAG。
- 业务系统负责自己的数据、权限过滤、检索、OCR、语音、视觉和向量库。

## Prompt Templates

管理 Prompt 模板草稿、发布版本和启用状态。

```http
GET /api/v1/prompt-templates?tenantId=1
Authorization: Bearer <console-token>
```

```http
POST /api/v1/prompt-templates
Authorization: Bearer <console-token>
Content-Type: application/json
```

```json
{
  "tenantId": 1,
  "templateCode": "support_summary",
  "templateName": "客服摘要模板",
  "description": "用于客服工单摘要",
  "content": "请总结以下工单：{{case_content}}",
  "status": "DRAFT"
}
```

相关接口：

```http
PUT /api/v1/prompt-templates/{id}
POST /api/v1/prompt-templates/{id}/publish
DELETE /api/v1/prompt-templates/{id}
GET /api/v1/prompt-templates/{id}/versions
```

发布会生成 `prompt_version` 快照。模板内容只允许保存配置文本，不得用来保存客户文档、RAG 切片或业务原始数据。

## Agent Configs

管理 Agent 基础配置。当前只作为配置中心，不运行 Agent Runtime。

```http
GET /api/v1/agent-configs?tenantId=1
Authorization: Bearer <console-token>
```

```http
POST /api/v1/agent-configs
Authorization: Bearer <console-token>
Content-Type: application/json
```

```json
{
  "tenantId": 1,
  "systemCode": "edms",
  "dataDomain": "document_text",
  "allowedDataDomains": "document_text,metadata",
  "agentCode": "document_search",
  "promptTemplateCode": "edms_rag_answer_zh",
  "agentName": "文档检索助手",
  "description": "用于业务系统传入检索结果后的文档问答",
  "systemPrompt": "你是企业文档助手，只能基于传入上下文回答。",
  "defaultModel": "qwen-plus",
  "temperature": 0.2,
  "maxTokens": 2048,
  "status": "ACTIVE"
}
```

相关接口：

```http
PUT /api/v1/agent-configs/{id}
DELETE /api/v1/agent-configs/{id}
```

## Agent Runtime Config

业务系统可以通过自己的 Yeho API Key 按 `agent_code` 读取 Agent 配置和已发布 Prompt 模板，避免在业务系统中硬编码 Prompt。

```http
GET /api/v1/agent-runtime/configs/{agent_code}
Authorization: Bearer <yeho-api-key>
X-Yeho-System-Code: <system_code>
X-Yeho-Data-Domain: <data_domain>
```

权限要求：

- API Key 需要 `agent:read`、`chat:completion` 或 `admin:*` scope。
- 如果 API Key 配置了 `allowedSystemCodes` / `allowedDataDomains`，请求头必须匹配。
- Agent 配置中的 `systemCode` / `dataDomain` / `allowedDataDomains` 也会参与校验。

成功读取会写入一条 `agent_execute_log`，Token 和 Credits 为 `0`，用于标记业务系统读取了 Agent / Prompt 配置。

## Workflow Preview

Workflow 第一阶段是配置中心和调用契约，不是执行引擎。

平台负责：

- 保存 `workflow_code`
- 保存 `schema_json`
- 绑定业务系统、数据域、Agent 和默认模型
- 发布版本
- 提供读取接口
- 在网关日志和 Agent 日志中记录 `workflow_code`

业务系统负责：

- 执行真实流程
- 检索自己的数据
- 权限过滤
- OCR / 语音 / 视觉处理
- 拼装上下文
- 调用 Yeho Chat / Embedding API

已接入系统需要新增的配置项：

```bash
YEHO_AI_WORKFLOW_CODE=<workflow_code>
```

处理规则：

- 启动时或缓存失效时读取 `/api/v1/workflow-runtime/configs/{workflow_code}`。
- 若 Workflow 返回 `agentCode`，继续复用既有 Agent Runtime Config 读取逻辑。
- Chat 调用携带 `X-Yeho-Workflow-Code`，用于 Usage Log 与 Agent Log 关联。
- Embedding 调用建议只携带 `X-Yeho-System-Code` 和 `X-Yeho-Data-Domain`，不要携带 Agent / Workflow Header。

管理接口：

```http
GET /api/v1/workflows?tenantId=1
POST /api/v1/workflows
PUT /api/v1/workflows/{id}
POST /api/v1/workflows/{id}/publish
DELETE /api/v1/workflows/{id}
GET /api/v1/workflows/{id}/versions
Authorization: Bearer <console-token>
```

创建示例：

```json
{
  "tenantId": 1,
  "workflowCode": "document_qa",
  "workflowName": "文档问答流程",
  "description": "业务系统检索后调用模型回答",
  "systemCode": "edms",
  "dataDomain": "document_text",
  "agentCode": "document_search",
  "defaultModel": "qwen-plus",
  "schemaJson": "{\"version\":\"1\",\"steps\":[{\"type\":\"retrieve\",\"name\":\"业务系统检索\"},{\"type\":\"agent\",\"name\":\"生成回答\"}]}",
  "status": "DRAFT"
}
```

业务系统读取已发布 Workflow 配置：

```http
GET /api/v1/workflow-runtime/configs/{workflow_code}
Authorization: Bearer <yeho-api-key>
X-Yeho-System-Code: <system_code>
X-Yeho-Data-Domain: <data_domain>
```

权限要求：

- API Key 需要 `workflow:read`、`agent:read`、`chat:completion` 或 `admin:*` scope。
- 请求头必须满足 API Key 的业务系统和数据域限制。
- Workflow 配置中的 `systemCode` / `dataDomain` 必须与请求上下文匹配。

返回示例：

```json
{
  "code": 0,
  "message": "OK",
  "requestId": "req_xxx",
  "data": {
    "tenantId": "1",
    "workflowCode": "document_qa",
    "workflowName": "文档问答流程",
    "systemCode": "edms",
    "dataDomain": "document_text",
    "agentCode": "document_search",
    "defaultModel": "qwen-plus",
    "versionNo": 1,
    "schemaJson": "{\"version\":\"1\",\"steps\":[...]}"
  }
}
```

Chat 调用关联 Workflow：

```http
POST /v1/chat/completions
Authorization: Bearer <yeho-api-key>
X-Yeho-System-Code: <system_code>
X-Yeho-Data-Domain: <data_domain>
X-Yeho-Agent-Code: <agent_code>
X-Yeho-Workflow-Code: <workflow_code>
Content-Type: application/json
```

携带 `X-Yeho-Workflow-Code` 后，Yeho 会在 `ai_usage_log` 和 `agent_execute_log` 中记录 `workflow_code`，方便统计哪个流程最常被调用、最耗费积分或失败率最高。

注意：`X-Yeho-Workflow-Code` 推荐只用于最终 Chat / Agent 场景。纯向量化请求应避免携带该 Header，以免把索引任务与业务流程执行混在一起。

## Agent Execute Logs

```http
GET /api/v1/agent-execute-logs?tenantId=1&requestId=req_xxx&traceId=trace_xxx&workflowCode=document_qa
Authorization: Bearer <console-token>
```

日志字段包括：

- `request_id`
- `trace_id`
- `tenant_id`
- `system_code`
- `data_domain`
- `workflow_code`
- `agent_code`
- `model`
- `latency_ms`
- Token 用量
- Credits 消耗
- 成功或错误信息

`agent_execute_log` 不保存敏感 Prompt 原文、客户文档原文、切片内容或向量。

## Console Pages

- `/prompt-templates`
- `/agent-configs`
- `/workflow`
- `/agent-execute-logs`
