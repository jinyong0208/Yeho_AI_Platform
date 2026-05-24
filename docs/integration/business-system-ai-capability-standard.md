# 业务系统 AI 能力接入与数据规范

## 1. 文档目的

本文档定义业务系统接入 Yeho AI Platform 的标准边界、数据规范和接口要求。

适用系统包括但不限于：

- EDMS
- EQMS
- AI 客服
- 养老机器人平台
- 大屏系统
- IoT 系统
- 工业 AI 场景
- 语音、视觉、多模态业务系统

本文档不规定各业务系统的具体部署方式、框架选型或内部实现。各业务系统可以自行选择 Qdrant、pgvector、Milvus、Elasticsearch、对象存储、消息队列或其他组件。

Yeho AI Platform 只定义接入标准和能力边界。

## 2. 总体边界

核心原则：

```text
业务系统管数据，Yeho AI Platform 管能力。
```

Yeho AI Platform 负责：

- 模型调用
- 模型路由
- API Key 鉴权
- 租户识别
- 额度检查
- Credits 扣费
- Token 统计
- 调用审计
- Provider Adapter
- Prompt / Agent / Workflow 编排预留

业务系统负责：

- 原始业务数据保存
- 文档、图片、音频、视频等原始文件保存
- 文本解析
- 切片
- 向量化结果保存
- 向量索引
- RAG 检索
- 权限过滤
- 业务权限判断
- 业务上下文组装

Yeho AI Platform 禁止：

- 集中保存客户完整文档
- 集中保存文档切片
- 集中保存客户向量索引
- 替代业务系统做数据权限过滤
- 直接访问业务系统数据库
- 直接访问业务系统向量数据库
- 保存未脱敏的敏感 Prompt 原文

## 3. 推荐集成架构

```text
业务系统
  |
  | 1. 保存原始数据、解析、切片
  v
业务系统私有数据层
  - 业务数据库
  - 文件存储
  - Qdrant / pgvector / Milvus
  |
  | 2. 调用 Yeho Embedding API 获取向量
  v
Yeho AI Platform
  - API Key
  - 模型路由
  - Provider Adapter
  - Credits
  - Usage Log
  - Audit Log
  |
  | 3. 返回 embedding / chat / future multimodal response
  v
业务系统
  |
  | 4. 本地保存向量、执行检索、权限过滤、组装上下文
  v
业务系统用户
```

## 4. Qdrant 使用要求

如业务系统选择本地 Docker 部署 Qdrant，应遵守以下标准。

注意：Qdrant 部署、备份、扩容和运维由业务系统自行负责，不属于 Yeho AI Platform 第一阶段核心依赖。

### 4.1 Collection 命名规范

推荐格式：

```text
{system_code}_{tenant_code}_{data_domain}_{embedding_model}
```

示例：

```text
edms_default_document_text_v1
eqms_tenant001_quality_record_v1
cs_tenant001_faq_text_v1
robot_tenant001_voice_transcript_v1
vision_tenant001_image_caption_v1
```

要求：

- Collection 必须能区分业务系统。
- Collection 必须能区分租户。
- Collection 必须能区分数据域。
- Collection 必须能区分 embedding 模型版本。
- 不同 embedding 维度的数据禁止混入同一个 Collection。

### 4.2 Vector 维度规范

业务系统必须记录：

- `embedding_model`
- `embedding_provider`
- `embedding_dimension`
- `embedding_version`
- `created_at`

要求：

- 向量维度必须与实际 embedding 模型返回值一致。
- 不允许在代码中无说明地硬编码维度。
- 如更换 embedding 模型，必须新建 Collection 或执行完整重建索引。
- 历史向量和新模型向量不得混查。

### 4.3 Point ID 规范

推荐使用稳定 ID：

```text
{system_code}:{tenant_id}:{data_type}:{source_id}:{chunk_id}:{embedding_model}
```

示例：

```text
edms:1:document:doc_10001:chunk_0001:text-embedding-v4
```

要求：

- Point ID 必须幂等。
- 同一切片重复向量化时应覆盖同一 Point。
- 禁止使用无法追踪来源的随机 ID 作为唯一业务标识。

### 4.4 Payload 标准字段

Qdrant payload 必须至少包含以下字段：

```json
{
  "tenant_id": "1",
  "system_code": "EDMS",
  "workspace_id": "space_001",
  "data_domain": "document",
  "source_type": "document",
  "source_id": "doc_10001",
  "chunk_id": "chunk_0001",
  "chunk_index": 1,
  "title": "合同管理制度",
  "content_hash": "sha256:xxxx",
  "language": "zh-CN",
  "embedding_provider": "QWEN",
  "embedding_model": "text-embedding-v4",
  "embedding_version": "v1",
  "permission_version": "2026-05-23T10:00:00+08:00",
  "created_at": "2026-05-23T10:00:00+08:00",
  "updated_at": "2026-05-23T10:00:00+08:00"
}
```

可选字段：

```json
{
  "document_type": "contract",
  "file_type": "pdf",
  "tags": ["合同", "续签"],
  "department_ids": ["dept_001"],
  "owner_user_id": "user_1001",
  "security_level": "internal",
  "source_url": "https://edms.example.com/docs/doc_10001",
  "summary": "合同续签制度摘要",
  "page_no": 3,
  "section_title": "续签流程"
}
```

禁止放入 payload 的内容：

- 完整文档原文
- 大段未脱敏敏感内容
- 用户密码
- Provider API Key
- Yeho API Key
- 身份证号、银行卡号等未脱敏强敏感数据

如业务系统需要在 payload 中保存 `content`，必须确保：

- 内容已经按业务安全要求脱敏。
- 内容是切片文本，不是完整文档。
- 该数据仍保存在业务系统私有环境，不上传到 Yeho AI Platform。

## 5. 文本切片规范

推荐字段：

```json
{
  "chunk_id": "chunk_0001",
  "chunk_index": 1,
  "content": "合同续签应在到期前 30 天提交申请。",
  "token_count": 32,
  "char_count": 18,
  "start_offset": 1024,
  "end_offset": 1088,
  "metadata": {
    "page_no": 3,
    "section_title": "续签流程"
  }
}
```

要求：

- 每个切片必须能追溯到原始数据。
- 每个切片必须有稳定 `chunk_id`。
- 切片更新后必须更新向量。
- 删除原始数据后必须删除对应向量。
- 权限变化后必须更新权限版本或重建检索过滤条件。

推荐切片策略：

- 文档类：按标题、段落、页码切分。
- FAQ 类：按问答对切分。
- 工单类：按问题、处理过程、结论切分。
- 语音转写类：按时间窗口、说话人、语义段落切分。
- 图像/视频描述类：按图片、帧、场景、识别结果切分。

## 6. 权限过滤要求

业务系统必须在返回 RAG 结果前完成权限过滤。

权限过滤输入至少包含：

```json
{
  "tenant_id": "1",
  "user_id": "user_1001",
  "roles": ["DOCUMENT_VIEWER"],
  "department_ids": ["dept_001"],
  "workspace_ids": ["space_001"],
  "action": "read"
}
```

要求：

- 检索结果必须先通过业务权限过滤，再传给模型。
- Yeho AI Platform 不判断文档级、图片级、音频级、视频级权限。
- 不允许把未授权数据放进 Prompt。
- 不允许只在前端隐藏数据，后端必须强制过滤。
- 权限变更后，检索结果必须实时或近实时生效。

## 7. Yeho Embedding API 接入规范

业务系统调用 Yeho Embedding API 获取向量。

```http
POST /v1/embeddings
Authorization: Bearer <yeho-tenant-api-key>
Content-Type: application/json
```

API Key 必须包含 scope：

```text
embedding:create
```

请求：

```json
{
  "model": "text-embedding-v4",
  "input": [
    "合同续签应在到期前 30 天提交申请。"
  ],
  "encoding_format": "float"
}
```

响应：

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.0123, -0.0456],
      "index": 0
    }
  ],
  "model": "text-embedding-v4",
  "usage": {
    "prompt_tokens": 12,
    "total_tokens": 12
  }
}
```

要求：

- 业务系统保存返回向量。
- Yeho AI Platform 不保存向量。
- 业务系统必须记录 embedding 模型和维度。
- 批量向量化时必须限流、重试、断点续跑。
- 不要把完整超长文档一次性提交给 embedding 接口。

## 8. Yeho Chat Completions API 接入规范

业务系统完成检索和权限过滤后，调用 Yeho Chat API。

```http
POST /v1/chat/completions
Authorization: Bearer <yeho-tenant-api-key>
Content-Type: application/json
```

API Key 必须包含 scope：

```text
chat:completion
```

请求：

```json
{
  "model": "qwen-plus",
  "messages": [
    {
      "role": "system",
      "content": "你是企业知识助手。只能基于给定上下文回答；如果上下文不足，请明确说明无法确认。"
    },
    {
      "role": "user",
      "content": "问题：合同续签需要提前多久申请？\n\n上下文：\n[1] 合同续签应在到期前 30 天提交申请。"
    }
  ],
  "temperature": 0.2,
  "max_tokens": 800,
  "stream": false
}
```

响应：

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "model": "qwen-plus",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "合同续签需要在到期前 30 天提交申请。"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 30,
    "total_tokens": 130
  }
}
```

要求：

- `messages` 中只能放当前请求必要上下文。
- 不要把完整文档塞入 Prompt。
- 不要把用户无权限的数据放入 Prompt。
- 不要在业务系统日志中打印完整 Prompt。
- 业务系统应保存自己的业务调用记录，但敏感上下文必须脱敏或只保存摘要。

## 9. RAG 检索接口规范

如业务系统需要对外提供 RAG 检索能力，推荐接口：

```http
POST /api/ai/rag/retrieve
Authorization: Bearer <business-system-service-token>
Content-Type: application/json
X-Request-Id: <request_id>
```

请求：

```json
{
  "tenant_id": "1",
  "user_id": "user_1001",
  "query": "合同续签规则",
  "top_k": 5,
  "filters": {
    "workspace_id": "space_001",
    "data_domain": "document",
    "document_types": ["contract", "policy"],
    "tags": ["续签"]
  },
  "permission_context": {
    "roles": ["DOCUMENT_VIEWER"],
    "department_ids": ["dept_001"]
  }
}
```

响应：

```json
{
  "request_id": "req_001",
  "tenant_id": "1",
  "items": [
    {
      "source_id": "doc_10001",
      "chunk_id": "chunk_0001",
      "title": "合同管理制度",
      "content": "合同续签应在到期前 30 天提交申请。",
      "score": 0.91,
      "source": {
        "system": "EDMS",
        "url": "https://edms.example.com/docs/doc_10001"
      },
      "metadata": {
        "page_no": 3,
        "document_type": "policy",
        "updated_at": "2026-05-23T10:00:00+08:00"
      }
    }
  ]
}
```

要求：

- 返回结果必须已经完成权限过滤。
- `content` 应为必要切片，不是完整文档。
- `source_id` 和 `chunk_id` 必须能回溯业务数据。
- `score` 必须是本次检索相似度或排序分。
- `metadata` 不得包含敏感密钥。

## 10. 语音场景数据规范

语音业务系统可以自行完成：

- 音频保存
- ASR 转写
- 说话人识别
- 时间轴切片
- 语音摘要
- 语音向量或文本向量索引

推荐语音切片结构：

```json
{
  "tenant_id": "1",
  "source_type": "audio",
  "source_id": "call_10001",
  "chunk_id": "audio_chunk_0001",
  "start_ms": 12000,
  "end_ms": 28000,
  "speaker": "customer",
  "transcript": "我想查询合同续签需要什么流程。",
  "language": "zh-CN",
  "metadata": {
    "channel": "customer_service",
    "call_id": "call_10001"
  }
}
```

要求：

- 原始音频保存在业务系统。
- Yeho AI Platform 不保存原始音频。
- 语音转写文本如需向量化，由业务系统调用 Yeho Embedding API。
- 语音问答时，由业务系统组装上下文后调用 Yeho Chat API。

## 11. 视觉场景数据规范

视觉业务系统可以自行完成：

- 图片保存
- 视频保存
- OCR
- 图像描述
- 目标检测
- 帧提取
- 图片/视频元数据索引
- 多模态模型调用编排

推荐视觉切片结构：

```json
{
  "tenant_id": "1",
  "source_type": "image",
  "source_id": "image_10001",
  "chunk_id": "vision_chunk_0001",
  "caption": "图片显示一台设备的温度仪表，读数为 82 摄氏度。",
  "ocr_text": "TEMP 82C",
  "objects": [
    {
      "label": "temperature_meter",
      "confidence": 0.94
    }
  ],
  "metadata": {
    "camera_id": "cam_001",
    "captured_at": "2026-05-23T10:00:00+08:00"
  }
}
```

要求：

- 原始图片和视频保存在业务系统。
- Yeho AI Platform 不保存原始图片、视频或帧数据。
- OCR、caption、检测结果如需向量化，由业务系统自行保存向量。
- 多模态模型能力后续通过 Yeho API 扩展，业务系统仍保留原始媒体数据。

## 12. 业务系统调用日志规范

业务系统应保存自己的调用记录。

推荐字段：

```json
{
  "request_id": "req_001",
  "tenant_id": "1",
  "user_id": "user_1001",
  "system_code": "EDMS",
  "capability": "rag_chat",
  "yeho_model": "qwen-plus",
  "yeho_api": "/v1/chat/completions",
  "source_ids": ["doc_10001"],
  "chunk_ids": ["chunk_0001"],
  "success": true,
  "latency_ms": 1200,
  "created_at": "2026-05-23T10:00:00+08:00"
}
```

禁止记录：

- 完整 Provider API Key
- 完整 Yeho API Key
- 完整敏感 Prompt
- 用户无权限数据
- 大段客户原文

允许记录：

- request_id
- 模型编码
- token usage
- latency
- success
- error_code
- 脱敏摘要
- source_id / chunk_id

## 13. API Key 管理要求

每个业务系统应使用 Yeho 租户 API Key 调用 Yeho。

推荐 scopes：

```text
chat:completion
embedding:create
models:read
usage:read
```

要求：

- API Key 不得写死在前端。
- API Key 不得提交到 Git。
- API Key 应通过环境变量或密钥管理系统注入。
- API Key 泄露后必须立即在 Yeho 控制台停用或吊销。
- 不同环境使用不同 API Key。
- 不同业务系统建议使用不同 API Key，方便审计和限流。

## 14. 错误处理规范

业务系统对 Yeho API 错误必须做标准处理。

常见错误：

```json
{
  "error": {
    "message": "API key scope is not allowed",
    "type": "insufficient_scope",
    "param": "",
    "code": 403
  }
}
```

处理要求：

- `401`：API Key 无效或缺失。
- `403`：scope 不足。
- `402`：余额不足或额度限制。
- `429`：触发限流。
- `5xx`：Yeho 或 Provider 调用失败。

业务系统必须：

- 保留 request_id。
- 对 `429` 做退避重试。
- 对 `5xx` 做有限重试。
- 对 `401` / `403` 不做无限重试。
- 向用户展示业务可理解的错误，不暴露密钥和内部堆栈。

## 15. request_id 规范

业务系统每次 AI 调用建议生成全局唯一 request_id。

格式建议：

```text
{system_code}_{timestamp}_{random}
```

示例：

```text
edms_20260523100000_a8f31c
```

要求：

- request_id 应贯穿业务系统日志、Yeho 调用、RAG 检索、向量查询。
- 如调用 Yeho API，应在日志中记录 Yeho 返回的 response id。
- 排查问题时优先使用 request_id 串联链路。

## 16. 最小接入清单

业务系统接入 Yeho 前必须完成：

- 已有租户映射关系。
- 已申请 Yeho Tenant API Key。
- API Key 具备所需 scopes。
- 已完成本地数据权限模型。
- 已确定向量数据库方案。
- 已确定 embedding 模型和维度。
- 已实现切片幂等 ID。
- 已实现向量重建机制。
- 已实现权限过滤。
- 已实现调用日志脱敏。
- 已实现 API Key 安全注入。

## 17. 验收标准

业务系统接入完成后，至少验证：

1. 无权限用户无法检索到受限数据。
2. 删除文档后，向量库中对应 Point 被删除。
3. 更新文档后，相关切片和向量被更新。
4. 更换 embedding 模型后，不混用旧向量。
5. Yeho Usage Log 能看到调用记录。
6. Yeho 钱包能扣费。
7. Yeho API Key scope 控制生效。
8. 业务系统日志不出现完整 API Key。
9. 业务系统日志不出现完整敏感 Prompt。
10. Qdrant payload 不包含密钥和完整敏感原文。

## 18. 严格禁止

业务系统不得要求 Yeho AI Platform：

- 保存客户完整文档
- 保存客户完整音频
- 保存客户完整视频
- 保存客户完整图片
- 保存文档切片
- 保存向量索引
- 接管业务权限系统
- 直接连接业务数据库
- 直接连接业务向量数据库

业务系统不得：

- 绕过 Yeho 直接调用 DeepSeek、Qwen、OpenAI 等 Provider。
- 在前端暴露 Yeho API Key。
- 在日志打印 Provider API Key。
- 在日志打印完整敏感 Prompt。
- 把未授权内容放入 Prompt。

## 19. 推荐实施阶段

### 阶段 1：文本 RAG

- 文档解析
- 文本切片
- Yeho Embedding API
- Qdrant 本地索引
- 权限过滤
- Yeho Chat API

### 阶段 2：语音文本化

- ASR 转写
- 转写切片
- 转写向量化
- 语音问答

### 阶段 3：视觉结构化

- OCR
- 图片描述
- 检测结果结构化
- 视觉文本向量化

### 阶段 4：多模态编排

- 业务系统保存多模态原始数据
- Yeho 提供统一模型能力入口
- 业务系统负责权限和上下文选择

## 20. 接入示例

### Embedding

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("YEHO_API_KEY"),
    base_url=os.getenv("YEHO_BASE_URL", "http://localhost:8080/v1"),
)

response = client.embeddings.create(
    model="text-embedding-v4",
    input=["合同续签应在到期前 30 天提交申请。"],
)

vector = response.data[0].embedding
```

### Chat

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("YEHO_API_KEY"),
    base_url=os.getenv("YEHO_BASE_URL", "http://localhost:8080/v1"),
)

response = client.chat.completions.create(
    model="qwen-plus",
    messages=[
        {
            "role": "system",
            "content": "你是企业知识助手。只能基于给定上下文回答。",
        },
        {
            "role": "user",
            "content": "问题：合同续签提前多久？\n上下文：合同续签应在到期前 30 天提交申请。",
        },
    ],
    temperature=0.2,
    max_tokens=800,
    stream=False,
)

print(response.choices[0].message.content)
```

