# Yeho AI Platform 调用方接入指南

## 1. 适用范围

本文档给所有业务系统调用 Yeho AI Platform 使用，包括但不限于：

- EDMS
- EQMS
- AI 客服
- 养老机器人
- 大屏系统
- IoT 系统
- 工业 AI 场景
- 语音、视觉、多模态业务系统

Yeho AI Platform 的职责是提供统一 AI Gateway、Billing、Audit、Runtime 能力，不负责保存或管理业务系统的数据闭环。

## 2. 架构边界

总原则：

```text
业务系统管数据，Yeho AI Platform 管能力。
```

业务系统负责：

- 原始业务数据
- 文档、图片、音频、视频等原始文件
- 文本解析
- 文档切片
- 向量索引
- RAG 检索
- 权限过滤
- 业务上下文组装
- 搜索结果排序和业务规则判断

Yeho AI Platform 负责：

- 模型调用
- 模型路由
- API Key 鉴权
- API Key scope 权限
- API Key 业务系统 / 数据域限制
- 租户识别
- 余额检查
- Credits 扣费
- Token 统计
- Usage Log
- Audit Log
- Provider Adapter
- Prompt / Agent 配置管理

Yeho AI Platform 禁止：

- 集中保存客户完整文档
- 集中保存客户文档切片
- 集中保存客户向量索引
- 替代业务系统做权限过滤
- 直接访问业务系统数据库
- 直接访问业务系统向量数据库

## 3. 调用方配置项

推荐每个业务系统都配置以下变量：

```bash
YEHO_AI_BASE_URL=https://api.yehosoft.com/v1
YEHO_AI_PLATFORM_API_BASE_URL=https://api.yehosoft.com/api/v1
YEHO_AI_API_KEY=你的 Yeho API Key
YEHO_AI_SYSTEM_CODE=edms
YEHO_AI_DATA_DOMAIN=document_text
YEHO_AI_AGENT_CODE=document_search
YEHO_AI_CHAT_MODEL=qwen-plus
YEHO_AI_EMBEDDING_MODEL=text-embedding-v4
YEHO_AI_TIMEOUT_SECONDS=30
YEHO_AI_MAX_RETRIES=2
```

如果业务系统运行在本机：

```bash
YEHO_AI_BASE_URL=http://127.0.0.1:8080/v1
```

如果业务系统运行在 Docker 容器内，并访问宿主机上的 Yeho 后端：

```bash
YEHO_AI_BASE_URL=http://host.docker.internal:8080/v1
```

如果业务系统和 Yeho 后端在同一个 Docker Compose 网络内：

```bash
YEHO_AI_BASE_URL=http://platform:8080/v1
```

生产环境推荐：

```bash
YEHO_AI_BASE_URL=https://api.yehosoft.com/v1
```

## 4. 必带 Header

所有业务系统调用 OpenAI-compatible API 时，建议携带：

```http
Authorization: Bearer {YEHO_AI_API_KEY}
Content-Type: application/json
X-Yeho-System-Code: {YEHO_AI_SYSTEM_CODE}
X-Yeho-Data-Domain: {YEHO_AI_DATA_DOMAIN}
X-Yeho-Agent-Code: {YEHO_AI_AGENT_CODE}
```

字段说明：

| Header | 必填 | 说明 |
| --- | --- | --- |
| `Authorization` | 是 | Yeho API Key |
| `X-Yeho-System-Code` | 建议必填 | 业务系统编码，例如 `edms`、`eqms`、`robot` |
| `X-Yeho-Data-Domain` | 建议必填 | 数据域，例如 `document_text`、`faq`、`voice_transcript` |
| `X-Yeho-Agent-Code` | 可选 | Agent / 场景编码，例如 `document_search`、`customer_reply` |

如果 API Key 配置了 `allowedSystemCodes` 或 `allowedDataDomains`，则对应 Header 变为必填，否则会返回 403。

## 5. API Key 权限

调用方 API Key 至少需要以下 scope：

| 场景 | 必需 scope |
| --- | --- |
| 聊天 / 文本生成 | `chat:completion` |
| 读取 Agent / Prompt 配置 | `agent:read` 或 `chat:completion` |
| Embedding | `embedding:create` |
| 查询模型列表 | `models:read` |

示例 API Key 配置：

```json
{
  "name": "edms-rag-key",
  "scopes": ["chat:completion", "agent:read", "embedding:create", "models:read"],
  "allowedSystemCodes": ["edms"],
  "allowedDataDomains": ["document_text", "metadata"]
}
```

说明：

- `allowedSystemCodes` 为空表示不额外限制业务系统。
- `allowedDataDomains` 为空表示不额外限制数据域。
- 配置限制后，请求 Header 必须匹配。
- API Key 数据库只保存 hash，完整 Key 只在创建时展示一次。

## 6. Agent Runtime Config

业务系统应优先按 `agent_code` 从 Yeho 读取 Agent 配置和已发布 Prompt 模板，避免在业务系统代码里硬编码 Prompt。

接口：

```http
GET /api/v1/agent-runtime/configs/{agent_code}
```

请求示例：

```bash
curl ${YEHO_AI_PLATFORM_API_BASE_URL}/agent-runtime/configs/${YEHO_AI_AGENT_CODE} \
  -H "Authorization: Bearer ${YEHO_AI_API_KEY}" \
  -H "X-Yeho-System-Code: ${YEHO_AI_SYSTEM_CODE}" \
  -H "X-Yeho-Data-Domain: ${YEHO_AI_DATA_DOMAIN}"
```

返回中的关键字段：

| 字段 | 说明 |
| --- | --- |
| `data.defaultModel` | 默认聊天模型，例如 `qwen-plus` |
| `data.temperature` | 默认温度参数 |
| `data.maxTokens` | 默认输出 Token 上限 |
| `data.systemPrompt` | Agent 系统 Prompt |
| `data.promptTemplate.content` | 已发布 Prompt 模板内容 |
| `data.promptTemplate.versionNo` | 已发布版本号 |

Prompt 模板解析规则：

- Agent 配置了 `promptTemplateCode` 时，优先读取该模板。
- `promptTemplateCode` 为空时，回退匹配 `templateCode = agentCode`。
- 只返回 `PUBLISHED` 状态模板，草稿不会暴露给业务系统。
- Yeho 只返回配置文本，不保存业务系统传入的文档、切片或向量。

业务系统拿到模板后，在本地完成 `{{question}}`、`{{contexts}}` 等变量替换，再调用 `/v1/chat/completions`。

## 7. Chat Completions

接口：

```http
POST /v1/chat/completions
```

请求示例：

```bash
curl https://api.yehosoft.com/v1/chat/completions \
  -H "Authorization: Bearer ${YEHO_AI_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Yeho-System-Code: edms" \
  -H "X-Yeho-Data-Domain: document_text" \
  -H "X-Yeho-Agent-Code: document_search" \
  -d '{
    "model": "qwen-plus",
    "messages": [
      {
        "role": "system",
        "content": "你是企业文档助手。请只基于业务系统传入的检索结果回答。"
      },
      {
        "role": "user",
        "content": "请总结这份制度的审批要求。"
      }
    ],
    "temperature": 0.2,
    "max_tokens": 800,
    "stream": false
  }'
```

支持字段：

- `model`
- `messages`
- `temperature`
- `max_tokens`
- `stream`

当前建议业务系统先使用 `stream=false`。如使用 `stream=true`，调用方需要按 SSE 处理返回。

如果请求携带 `X-Yeho-Agent-Code`，Yeho 会在模型调用完成后写入 Agent 日志，记录 request_id、system_code、data_domain、agent_code、模型、延迟、Token 和 Credits。Agent 日志不保存 Prompt 原文、文档原文、切片或向量。

## 8. Embeddings

接口：

```http
POST /v1/embeddings
```

请求示例：

```bash
curl https://api.yehosoft.com/v1/embeddings \
  -H "Authorization: Bearer ${YEHO_AI_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Yeho-System-Code: edms" \
  -H "X-Yeho-Data-Domain: document_text" \
  -d '{
    "model": "text-embedding-v4",
    "input": ["需要向量化的文本"],
    "dimensions": 1024,
    "encoding_format": "float"
  }'
```

调用方必须保证：

- 请求中的 `dimensions` 与业务系统向量库 Collection 维度一致。
- Provider 返回向量维度必须与 `dimensions` 一致。
- 如果更换 embedding 模型或维度，必须新建 Collection 或完整重建索引。
- Yeho AI Platform 不保存 embedding 结果。

EDMS 当前推荐配置示例：

```yaml
YEHO_AI_EMBEDDING_MODEL: text-embedding-v4
EDMS_VECTOR_EMBEDDING_DIMENSION: 1024
```

## 9. RAG 调用方式

RAG 必须在业务系统侧完成：

```text
用户问题
  -> 业务系统鉴权
  -> 业务系统权限过滤
  -> 业务系统本地向量检索 / 关键词检索 / 混合检索
  -> 业务系统组装上下文
  -> 调用 Yeho /v1/chat/completions
  -> Yeho 返回模型结果
  -> 业务系统返回给用户
```

业务系统传给 Yeho 的 Prompt 应只包含完成回答所需的最小上下文，并避免发送无权限内容。

## 10. 错误响应

OpenAI-compatible 错误结构：

```json
{
  "error": {
    "message": "API key scope is not allowed",
    "type": "invalid_request_error",
    "code": "insufficient_scope"
  }
}
```

常见错误：

| HTTP 状态 | 场景 | 处理建议 |
| --- | --- | --- |
| 401 | API Key 缺失、错误或过期 | 检查 `Authorization` |
| 403 | scope 不足或 system/data 不匹配 | 检查 API Key scope 与 Header |
| 402 | Credits 余额不足 | 租户钱包充值 |
| 404 | model 不存在或未启用 | 检查模型配置 |
| 429 | 触发 RPM / TPM / Daily Credits / 并发限制 | 降低请求频率或调整限流 |
| 502 | Provider 调用失败 | 查看 Provider Health 与 Usage Log |

## 11. 调用方必须记录的本地信息

业务系统本地建议记录：

- `request_id`
- `system_code`
- `data_domain`
- `agent_code`
- `user_id`
- `tenant_id`
- 本地业务对象 ID
- 本地权限过滤结果摘要
- 检索命中文档 ID / chunk ID
- Yeho 返回的模型名、Token、错误码

注意：这些业务数据由调用方保存，Yeho AI Platform 不集中保存。

## 12. 最小集成检查清单

接入前确认：

- 已在 Yeho 创建租户。
- 已在 Yeho 登记业务系统。
- 已创建 API Key。
- API Key 具备必要 scope。
- API Key 的 `allowedSystemCodes` 包含调用方 `system_code`。
- API Key 的 `allowedDataDomains` 包含调用方 `data_domain`。
- 调用方 Header 已正确传入。
- Chat 模型已启用。
- Embedding 模型维度与向量库 Collection 一致。
- 租户钱包有足够 Credits。

## 13. 标准环境变量示例

```bash
YEHO_AI_ENABLED=true
YEHO_AI_BASE_URL=https://api.yehosoft.com/v1
YEHO_AI_PLATFORM_API_BASE_URL=https://api.yehosoft.com/api/v1
YEHO_AI_API_KEY=yh_sk_xxx
YEHO_AI_SYSTEM_CODE=edms
YEHO_AI_DATA_DOMAIN=document_text
YEHO_AI_AGENT_CODE=document_search
YEHO_AI_CHAT_MODEL=qwen-plus
YEHO_AI_EMBEDDING_MODEL=text-embedding-v4
YEHO_AI_TIMEOUT_SECONDS=30
YEHO_AI_MAX_RETRIES=2
EDMS_VECTOR_PROVIDER=qdrant
QDRANT_URL=http://127.0.0.1:6333
QDRANT_COLLECTION_PREFIX=edms
EDMS_VECTOR_DATA_DOMAIN=document_text
EDMS_VECTOR_EMBEDDING_VERSION=v1
EDMS_VECTOR_EMBEDDING_DIMENSION=1024
```
