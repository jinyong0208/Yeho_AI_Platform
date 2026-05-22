# Yeho AI Platform Architecture

Yeho AI Platform 定位为企业级 AI Gateway / Billing / Audit / Agent Orchestration 平台。

核心边界是：**EDMS 管数据，Yeho AI Platform 管能力**。

```text
apps/platform  Spring Boot 3 主平台
apps/web       React 管理后台
apps/agent     FastAPI AI 编排服务骨架
postgres       主业务数据库
redis          登录 token 与后续限流/缓存
minio          可选文件存储组件，不是第一阶段核心依赖
```

产品边界：

- Yeho AI Platform 不集中保存客户完整文档。
- Yeho AI Platform 不集中保存文档切片。
- Yeho AI Platform 不集中保存向量索引。
- EDMS 私有化环境负责文档原文、文档切片、向量索引、RAG 检索和权限过滤。
- Yeho AI Platform 负责模型调用、模型路由、API Key、租户、钱包/额度、Token 统计、调用审计、Prompt/Agent 编排和 Provider Adapter。

平台可预留 Embedding API / RAG 编排接口，但这些接口只能编排能力或接收 EDMS 已完成权限过滤后的检索结果，不在平台中心化保存客户知识数据。
