# 已接入业务系统 Workflow 预览升级说明

本文档用于已经接入 Yeho AI Platform 的业务系统升级到 Workflow 预览配置模式。

当前阶段只新增配置读取和审计关联，不要求业务系统迁移数据，也不启用平台侧 Workflow Runtime。

## 1. 需要新增的配置

在业务系统配置中新增：

```bash
YEHO_AI_WORKFLOW_CODE=<workflow_code>
```

推荐完整配置：

```bash
YEHO_AI_BASE_URL=https://api.yehosoft.com/v1
YEHO_AI_PLATFORM_API_BASE_URL=https://api.yehosoft.com/api/v1
YEHO_AI_API_KEY=<yeho_api_key>
YEHO_AI_SYSTEM_CODE=<system_code>
YEHO_AI_DATA_DOMAIN=<data_domain>
YEHO_AI_AGENT_CODE=<agent_code>
YEHO_AI_WORKFLOW_CODE=<workflow_code>
YEHO_AI_CHAT_MODEL=qwen-plus
YEHO_AI_EMBEDDING_MODEL=text-embedding-v4
```

EDMS 示例：

```yaml
edms:
  ai:
    yeho:
      base-url: ${YEHO_AI_BASE_URL:https://api.yehosoft.com/v1}
      platform-api-base-url: ${YEHO_AI_PLATFORM_API_BASE_URL:https://api.yehosoft.com/api/v1}
      api-key: ${YEHO_AI_API_KEY:}
      system-code: ${YEHO_AI_SYSTEM_CODE:edms}
      data-domain: ${YEHO_AI_DATA_DOMAIN:document_text}
      agent-code: ${YEHO_AI_AGENT_CODE:document_search}
      workflow-code: ${YEHO_AI_WORKFLOW_CODE:document_qa_workflow}
      chat-model: ${YEHO_AI_CHAT_MODEL:qwen-plus}
      embedding-model: ${YEHO_AI_EMBEDDING_MODEL:text-embedding-v4}
```

## 2. API Key 权限要求

用于业务系统调用的 API Key 至少需要：

- `chat:completion`
- `agent:read`
- `workflow:read`
- `embedding:create`，如果该系统需要语义检索或向量化
- `models:read`，如果该系统需要读取模型列表

如果 API Key 配置了业务系统和数据域限制，请确保：

- `allowedSystemCodes` 包含当前 `YEHO_AI_SYSTEM_CODE`
- `allowedDataDomains` 包含当前 `YEHO_AI_DATA_DOMAIN`

## 3. 启动时读取 Workflow 配置

业务系统启动时或缓存失效时调用：

```bash
curl https://api.yehosoft.com/api/v1/workflow-runtime/configs/${YEHO_AI_WORKFLOW_CODE} \
  -H "Authorization: Bearer ${YEHO_AI_API_KEY}" \
  -H "X-Yeho-System-Code: ${YEHO_AI_SYSTEM_CODE}" \
  -H "X-Yeho-Data-Domain: ${YEHO_AI_DATA_DOMAIN}"
```

返回值中重点使用：

- `data.workflowCode`
- `data.agentCode`
- `data.defaultModel`
- `data.versionNo`
- `data.schemaJson`

如果返回了 `agentCode`，业务系统继续复用原有 Agent 配置读取逻辑：

```bash
curl https://api.yehosoft.com/api/v1/agent-runtime/configs/${YEHO_AI_AGENT_CODE} \
  -H "Authorization: Bearer ${YEHO_AI_API_KEY}" \
  -H "X-Yeho-System-Code: ${YEHO_AI_SYSTEM_CODE}" \
  -H "X-Yeho-Data-Domain: ${YEHO_AI_DATA_DOMAIN}"
```

## 4. Chat 请求需要新增 Header

业务系统调用 `/v1/chat/completions` 时新增：

```http
X-Yeho-Workflow-Code: <workflow_code>
```

完整示例：

```http
POST https://api.yehosoft.com/v1/chat/completions
Authorization: Bearer <YEHO_AI_API_KEY>
Content-Type: application/json
X-Yeho-System-Code: <system_code>
X-Yeho-Data-Domain: <data_domain>
X-Yeho-Agent-Code: <agent_code>
X-Yeho-Workflow-Code: <workflow_code>
```

这样 Yeho 会在：

- Usage Log
- Agent Log

中记录 `workflow_code`，便于后续按业务流程统计 Token、积分、错误率和延迟。

## 5. Embedding 请求不要携带 Workflow Header

业务系统调用 `/v1/embeddings` 时建议只带：

```http
X-Yeho-System-Code: <system_code>
X-Yeho-Data-Domain: <data_domain>
```

不要携带：

```http
X-Yeho-Agent-Code
X-Yeho-Workflow-Code
```

原因：Embedding 通常属于索引或检索准备步骤，不应被误认为一次 Agent / Workflow 执行。

## 6. 业务系统仍然负责的部分

本次升级不改变数据边界。

业务系统仍然负责：

- 原始数据
- 文档、图片、音频、视频
- 文本解析
- 切片
- 向量索引
- RAG 检索
- 权限过滤
- 确定性排序和业务规则判断
- Prompt 变量替换和上下文组装

Yeho AI Platform 只负责：

- 返回配置
- 模型调用
- 模型路由
- API Key 鉴权
- Token 和积分统计
- 调用审计
- Agent / Workflow 日志关联

## 7. 给业务系统 AI 的修改指令

请按以下要求修改当前业务系统：

1. 新增配置项 `YEHO_AI_WORKFLOW_CODE`，并映射到应用配置中的 `workflowCode`。
2. 新增读取接口客户端：`GET {YEHO_AI_PLATFORM_API_BASE_URL}/workflow-runtime/configs/{workflowCode}`。
3. 请求读取 Workflow 配置时携带 `Authorization`、`X-Yeho-System-Code`、`X-Yeho-Data-Domain`。
4. 如果 Workflow 返回 `agentCode`，继续复用现有 Agent Runtime Config 读取逻辑。
5. 调用 `/v1/chat/completions` 时新增 Header：`X-Yeho-Workflow-Code`。
6. 调用 `/v1/embeddings` 时不要携带 `X-Yeho-Agent-Code` 和 `X-Yeho-Workflow-Code`。
7. 日志中允许记录 `workflowCode`、`agentCode`、`requestId`、`traceId`，禁止打印完整 API Key 和敏感 Prompt 原文。
8. 不要把文档原文、切片、向量或权限过滤逻辑迁移到 Yeho AI Platform。

## 8. 验证方式

1. 调用 Workflow 配置接口返回 `200 OK`。
2. Chat 请求成功返回模型结果。
3. Yeho 控制台的 Agent 日志能看到 `workflow_code`。
4. Usage Log 能按 `workflowCode` 查询到对应调用。
5. Embedding 请求仍正常，但不会产生 Agent Log。
