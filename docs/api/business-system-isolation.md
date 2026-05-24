# 业务系统隔离与网关调用上下文

## 定位

Yeho AI Platform 只管理 AI 能力，不集中保存客户文档、切片、向量索引、语音、图片或视频原始数据。

业务系统需要自行保存和管理：

- 原始业务数据
- 文件、图片、音频、视频
- 文档切片
- 向量索引
- RAG 检索
- 权限过滤

Yeho AI Platform 只记录调用元数据，用于鉴权、计费、审计和观测。

## 新增概念

### 业务系统

每个租户可登记多个业务系统，例如：

- `edms`
- `eqms`
- `customer_service`
- `robot`
- `vision`

管理接口：

```http
GET    /api/v1/tenants/{tenantId}/business-systems
POST   /api/v1/tenants/{tenantId}/business-systems
PUT    /api/v1/tenants/{tenantId}/business-systems/{id}
DELETE /api/v1/tenants/{tenantId}/business-systems/{id}
```

请求示例：

```json
{
  "systemCode": "edms",
  "systemName": "EDMS 文档系统",
  "description": "私有化部署的文档与 RAG 系统",
  "status": "ACTIVE"
}
```

### 数据域

数据域由业务系统定义，例如：

- `document_text`
- `metadata`
- `faq`
- `voice_transcript`
- `image_caption`

平台不会保存数据域里的数据，只在调用日志中记录标识。

## OpenAI-compatible Header

业务系统调用 Yeho OpenAI-compatible API 时，建议携带以下 Header：

```http
X-Yeho-System-Code: edms
X-Yeho-Data-Domain: document_text
X-Yeho-Agent-Code: document_search
```

适用接口：

```http
POST /v1/chat/completions
POST /v1/embeddings
```

## API Key 隔离

API Key 支持配置允许的业务系统和数据域：

```json
{
  "name": "edms-rag-key",
  "scopes": ["chat:completion", "embedding:create"],
  "allowedSystemCodes": ["edms"],
  "allowedDataDomains": ["document_text", "metadata"]
}
```

规则：

- `allowedSystemCodes` 为空：不额外限制业务系统。
- `allowedDataDomains` 为空：不额外限制数据域。
- 配置了允许列表后，请求必须携带对应 Header。
- Header 不在允许列表内时返回 403。
- 该限制与 scope 同时生效。

## Usage Log

`ai_usage_log` 会记录：

- `system_code`
- `data_domain`
- `agent_code`
- `tenant_id`
- `api_key_id`
- `model_code`
- `provider_code`
- `request_id`
- Token / Credits / 成本 / 延迟 / 错误

注意：不会记录完整 Prompt 原文，也不会记录客户知识数据。

## 推荐集成方式

业务系统应在自己的配置中固定：

```yaml
yeho:
  base-url: https://api.yehosoft.com/v1
  api-key: ${YEHO_AI_API_KEY}
  system-code: edms
  data-domain: document_text
  chat-model: qwen-plus
  embedding-model: text-embedding-v4
```

调用时把 `system-code`、`data-domain` 写入 Header。业务系统内部负责把检索结果、权限过滤结果和上下文组装后传给 chat/completions。
