# Yeho AI Platform Architecture

Phase 0 + Phase 1 使用 monorepo 和单体优先策略。

```text
apps/platform  Spring Boot 3 主平台
apps/web       React 管理后台
apps/agent     FastAPI AI 编排服务骨架
postgres       主业务数据库
redis          登录 token 与后续限流/缓存
minio          文件存储预留
```

当前阶段边界：

- Java 主平台负责租户、用户、登录雏形、基础权限角色、Flyway 数据库迁移。
- Web 控制台负责 Mantine 管理后台基础布局和 Phase 1 页面入口。
- Agent 服务只保留 FastAPI 分层骨架与 Provider Adapter 契约。
- 暂不实现复杂 AI 调用、OpenAI-compatible API、钱包扣费、RAG、Workflow、支付和发票正式对接。

后续 Phase 2 会在 Java 主平台中加入 Provider / Model 管理、Model Router 与 OpenAI-compatible Chat Completions API。
