# Yeho AI Agent Service

Phase 5 开始引入 Python Agent 服务的第一个可验证闭环。

已提供：

- `GET /health`
- `GET /api/v1/health`
- `GET /api/v1/agents/demo`
- `POST /api/v1/agents/demo/run`
- Java 转发接口：`POST /api/v1/agents/demo/run`
- Router / Service 分层
- Provider Adapter 抽象契约
- LangGraph Demo Agent

## Data Boundary

Agent orchestration can reserve Embedding API and RAG orchestration interfaces, but Yeho AI Platform must not centrally store customer original documents, document chunks, or vector indexes.

For EDMS scenarios, EDMS private deployments own document storage, chunking, vector indexes, RAG retrieval, and permission filtering. The Agent service can call EDMS retrieval APIs and use the permission-filtered context transiently during prompt/model orchestration.

Demo Agent 当前是规则型 LangGraph 流程，不调用外部模型。它用于验证：

- Java 主平台可以调用 Python Agent 服务
- Python Agent 服务可以执行 LangGraph workflow
- 请求可以携带 `tenantId`、`userId`、`requestId`
- 返回包含 `intent`、`answer`、`steps`、`latencyMs`

暂未实现：

- 多 Agent 自治
- 中心化 RAG
- 平台内向量知识库闭环
- Tool Calling
- 真实模型调用
- Workflow 可视化编排

Python 直连测试：

```bash
curl -X POST http://localhost:8000/api/v1/agents/demo/run \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"帮我看一下 wallet credits 扣费\",\"tenantId\":\"1\",\"userId\":\"1\"}"
```

Java 转发测试：

```bash
curl -X POST http://localhost:8080/api/v1/agents/demo/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <login_token>" \
  -d "{\"input\":\"帮我看一下 deepseek 模型路由\"}"
```
