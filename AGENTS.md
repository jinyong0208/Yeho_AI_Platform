# AGENTS.md — Yeho AI Platform 主线开发任务书

## 1. 项目定位

本项目为 **Yeho AI Platform**。

定位为企业级 AI Gateway / Billing / Audit / Agent Orchestration Platform。

本平台不是单一聊天机器人，也不是养老院专用系统，而是公司未来所有 AI 能力的统一平台，包括但不限于：

- EDMS3
- EQMS
- 养老机器人平台
- AI 客服
- EDMS 文档 AI 能力接入
- 大屏系统
- IoT 系统
- 工业 AI 场景

核心目标：

- 统一接入 Qwen、DeepSeek、OpenAI、Claude、本地模型
- 提供 OpenAI-compatible API
- 支持多租户
- 支持 Token 计费
- 支持钱包 / 充值 / 发票
- 支持 Prompt / Agent / Workflow 编排
- 预留 Embedding API / RAG 编排接口
- 支持 SaaS 与私有化部署

最新产品边界：

- Yeho AI Platform 不集中保存客户完整文档。
- Yeho AI Platform 不集中保存文档切片。
- Yeho AI Platform 不集中保存向量索引。
- EDMS 私有化环境负责文档原文、文档切片、向量索引、RAG 检索和权限过滤。
- Yeho AI Platform 只管理模型调用、模型路由、API Key、租户、钱包/额度、Token 统计、调用审计、Prompt/Agent 编排和 Provider Adapter。
- 总原则：**EDMS 管数据，Yeho AI Platform 管能力**。

---

## 2. 技术选型

### 2.1 前端

前端采用现代轻量 AI Console 风格。

使用：

- React 19
- Vite
- TypeScript
- Mantine UI
- Mantine Form
- Mantine Modals
- Mantine Notifications
- Mantine Charts
- React Router
- TanStack Query
- Axios
- Zustand
- LogicFlow
- Tabler Icons
- i18next
- Dayjs
- Recharts
- XLSX

不要使用：

- Ant Design
- Ant Design Pro
- ProComponents
- Umi
- dva
- qiankun

前端 UI 风格：

- AI Console 风格
- 现代化
- 卡片式布局
- 简洁轻量
- 支持深色模式预留
- 不要传统 ERP/OA 厚重风格
- 不要低代码化
- 不要过度封装

UI 风格参考：

- OpenWebUI
- LangSmith
- Vercel Dashboard
- Cursor Dashboard
- Dify Console

避免：

- 传统 ERP 风格
- 传统 OA 风格
- 重边框
- 重表格
- 老式后台布局

推荐依赖版本：

```json
{
  "@logicflow/core": "^2.1.11",
  "@logicflow/extension": "^2.1.15",
  "@mantine/charts": "^8.3.11",
  "@mantine/core": "^8.3.11",
  "@mantine/form": "^8.3.11",
  "@mantine/hooks": "^8.3.11",
  "@mantine/modals": "^8.3.11",
  "@mantine/notifications": "^8.3.11",
  "@tabler/icons-react": "^3.36.1",
  "@tanstack/react-query": "^5.90.16",
  "axios": "^1.13.2",
  "dayjs": "^1.11.19",
  "i18next": "^25.7.4",
  "i18next-browser-languagedetector": "^8.2.0",
  "i18next-http-backend": "^3.0.2",
  "immer": "^11.1.3",
  "lucide-react": "^0.562.0",
  "react": "^19.2.0",
  "react-diff-viewer-continued": "^4.2.0",
  "react-dom": "^19.2.0",
  "react-i18next": "^16.5.1",
  "react-router-dom": "^7.12.0",
  "recharts": "^3.8.1",
  "xlsx": "^0.18.5",
  "zustand": "^5.0.9"
}
```

推荐目录结构：

```text
apps/web/
├─ src/
│  ├─ api/
│  ├─ assets/
│  ├─ components/
│  ├─ layouts/
│  ├─ pages/
│  ├─ router/
│  ├─ store/
│  ├─ styles/
│  ├─ hooks/
│  ├─ i18n/
│  ├─ utils/
│  ├─ App.tsx
│  └─ main.tsx
├─ package.json
├─ vite.config.ts
└─ tsconfig.json
```

第一阶段页面：

- 登录页
- Dashboard
- 租户管理
- 用户管理
- 模型供应商管理
- 模型配置管理
- API Key 管理
- 钱包余额
- 钱包流水
- 调用日志
- Token 统计

LogicFlow 主要用于后续 Agent Workflow / 流程编排，第一阶段只安装依赖并预留页面，不需要复杂实现。

不要引入 OnlyOffice 文档编辑器依赖。EDMS 文档编辑、原文存储、切片和检索由 EDMS 私有化环境负责。

---

### 2.2 Java 主平台

Java 作为主平台后端。

负责：

- 多租户
- 用户权限
- API Key
- 钱包
- Token 计费
- 发票
- OpenAI-compatible API
- 审计日志
- 模型管理
- 管理后台 API

技术：

- Spring Boot 3
- Spring Security 或 Sa-Token
- MyBatis Plus
- PostgreSQL
- Redis
- Flyway
- Swagger / OpenAPI
- Lombok
- MapStruct

---

### 2.3 Python AI 服务

Python 作为 AI 编排层。

负责：

- Agent
- Embedding API 预留
- RAG 编排接口预留
- Tool Calling
- LangGraph
- Workflow
- 模型适配

Python AI 服务不得集中保存客户完整文档、文档切片或向量索引。需要 RAG 时，由 EDMS 私有化环境完成检索和权限过滤，平台只接收检索结果或编排请求。

技术：

- FastAPI
- LangGraph
- LangChain
- Pydantic
- httpx

---

### 2.4 数据层

数据库：

- PostgreSQL

向量：

- pgvector 不作为 Yeho AI Platform 中心化存储组件
- pgvector 可用于 EDMS 私有化环境，或后续私有知识库组件

缓存：

- Redis

文件：

- MinIO 为可选组件，不作为第一阶段核心依赖
- Yeho AI Platform 不集中保存客户完整文档

---

### 2.5 部署

第一阶段使用：

- Docker Compose

后续可扩展：

- Kubernetes

---

## 3. 总体架构

```text
业务系统 / 第三方系统
EDMS / EQMS / 养老机器人 / 客服 / 外部开发者
        ↓
EDMS 私有化环境负责文档原文 / 切片 / 向量索引 / RAG 检索 / 权限过滤
        ↓
Yeho AI Gateway / Billing / Audit / Agent Orchestration
        ↓
鉴权 / 租户 / 限流 / 余额检查 / 审计
        ↓
Model Router / Agent Router
        ↓
Qwen / DeepSeek / OpenAI / Claude / Ollama / vLLM
        ↓
Token 统计 / 成本核算 / 扣费 / 日志
```

---

## 4. MVP 范围

### 4.1 第一阶段交付范围

第一阶段只做核心闭环。

必须完成：

1. 多租户基础
2. 用户登录
3. 模型供应商管理
4. 模型配置管理
5. API Key 管理
6. OpenAI-compatible Chat Completions API
7. Token 统计
8. 钱包余额
9. 充值订单基础结构
10. 调用扣费
11. AI 调用日志
12. 管理后台基础页面
13. Docker Compose 一键启动

---

### 4.2 第一阶段暂不实现

第一阶段暂不实现：

1. 多 Agent 自治
2. 高级 Workflow
3. 正式支付网关
4. 发票正式税控对接
5. Kubernetes
6. 中心化 RAG
7. 中心化向量知识库闭环
8. 客户完整文档或文档切片集中存储
9. 复杂 LogicFlow 工作流编排

---

## 5. MVP 开发阶段划分

### Phase 0：项目初始化

创建 monorepo 结构。

---

### Phase 1：Java 主平台基础

完成：

- Spring Boot
- PostgreSQL
- Redis
- Flyway
- 登录
- 用户
- 租户
- 权限

---

### Phase 2：模型网关

完成：

- Provider 管理
- Model 管理
- OpenAI-compatible API
- DeepSeek Adapter
- Qwen Adapter

---

### Phase 3：钱包与计费

完成：

- 钱包
- Token 统计
- 余额检查
- 扣费
- Usage Log

---

### Phase 4：控制台

完成：

- React + Vite + TypeScript 管理后台
- Mantine UI 基础布局
- 模型管理
- API Key 管理
- Token 统计
- 调用日志

---

### Phase 5：Python Agent 服务

完成：

- FastAPI
- LangGraph
- Agent Demo
- Java 调用 Python

---

### Phase 6：Docker Compose

完成：

- 一键启动
- postgres
- redis
- minio 可选
- java
- python
- web

---

## 6. 第一阶段服务拆分

```text
yeho-ai-platform
  Java Spring Boot 主平台

yeho-ai-agent
  Python FastAPI AI 服务

yeho-ai-web
  React 管理后台

postgres
  PostgreSQL 数据库

redis
  Redis 缓存

minio
  可选文件存储组件，不作为第一阶段核心依赖
```

第一阶段不要过早微服务化。

Java 主平台先使用单体架构。

---

## 7. 核心模块设计

### 7.1 Tenant 租户模块

所有业务数据必须带：

```text
tenant_id
```

字段：

- id
- tenant_code
- tenant_name
- status
- contact_name
- contact_phone
- contact_email
- created_at
- updated_at

禁止跨租户查询。

---

### 7.2 用户模块

角色：

- SUPER_ADMIN
- TENANT_ADMIN
- DEVELOPER
- FINANCE
- VIEWER

---

### 7.3 模型供应商

例如：

- QWEN
- DEEPSEEK
- OPENAI
- CLAUDE
- OLLAMA
- VLLM

字段：

- provider_code
- provider_name
- base_url
- api_key
- status

API Key 必须加密保存。

---

### 7.4 模型配置

例如：

- deepseek-chat
- deepseek-reasoner
- qwen-plus
- qwen-max
- gpt-4.1
- local-qwen

字段：

- provider_id
- model_code
- display_name
- input_price
- output_price
- billing_multiplier
- support_stream
- support_tool_call
- status

---

### 7.5 API Key

字段：

- tenant_id
- api_key_hash
- api_key_prefix
- name
- status
- expired_at
- created_at
- last_used_at

要求：

- 数据库禁止存完整明文 Key
- 完整 Key 只在创建时展示一次
- 日志中禁止输出完整 Key

---

### 7.6 钱包模块

统一使用：

```text
Credits
```

不要直接使用人民币扣费。

建议：

```text
1 元 = 1000 Credits
```

字段：

- tenant_id
- balance_credits
- frozen_credits
- total_recharge_credits
- total_used_credits
- updated_at

---

### 7.7 钱包流水

字段：

- tenant_id
- biz_type
- biz_id
- direction
- amount_credits
- balance_after
- remark
- created_at

钱包扣费必须事务化。

禁止负数余额。

---

### 7.8 充值订单

字段：

- tenant_id
- order_no
- amount_cny
- credits
- status
- pay_channel
- paid_at
- created_at

状态：

- CREATED
- PAID
- CLOSED
- REFUNDED

第一阶段先做模拟支付或后台手动确认。

---

### 7.9 发票模块

第一阶段只做发票申请记录。

后续可对接：

- 百望云
- 诺诺发票
- 航信
- 金蝶发票云

字段：

- tenant_id
- invoice_title
- tax_no
- amount_cny
- invoice_type
- status
- email
- applied_at
- issued_at
- remark

状态：

- APPLIED
- PROCESSING
- ISSUED
- REJECTED

---

### 7.10 AI Usage Log

每次调用必须记录。

字段：

- tenant_id
- user_id
- api_key_id
- provider_code
- model_code
- request_id
- input_tokens
- output_tokens
- total_tokens
- real_cost
- charge_credits
- latency_ms
- success
- error_code
- error_message
- created_at

注意：

- Prompt 原文是否保存必须可配置
- 默认不要保存敏感原文
- 可保存脱敏摘要

---

## 8. OpenAI-compatible API

第一阶段必须实现：

```http
POST /v1/chat/completions
```

必须兼容：

- model
- messages
- temperature
- max_tokens
- stream: false

stream: true 第二阶段再做。

调用流程：

```text
1. 校验 Bearer Token
2. 获取 tenant
3. 检查 API Key 状态
4. 检查模型是否可用
5. 检查余额
6. 冻结 Credits
7. 调用模型
8. 统计 Token
9. 实际扣费
10. 释放多余冻结金额
11. 写 Usage Log
12. 返回 OpenAI-compatible Response
```

失败处理：

- 模型调用失败必须释放冻结金额
- 已产生真实成本时必须记录成本
- 所有失败必须写日志

---

## 9. 计费规则

平台统一使用：

```text
Credits
```

不要暴露底层模型真实价格。

第一版计费公式：

```text
charge_credits =
input_tokens * input_credit_rate
+
output_tokens * output_credit_rate
```

必须记录：

- real_cost
- charge_credits
- profit

必须支持统计：

- 每租户消耗
- 每模型消耗
- 每日消耗
- 每 API Key 消耗
- 成本与收入差

---

## 10. 安全要求

必须满足：

1. 多租户隔离
2. API Key Hash 存储
3. 模型供应商 API Key 加密保存
4. 日志禁止打印密钥
5. 钱包扣费事务化
6. 审计日志
7. 每次请求生成 request_id
8. 敏感数据脱敏
9. 后台接口必须鉴权
10. SUPER_ADMIN 接口不得暴露给普通租户

---

## 11. 编码规范

### 11.1 Java

要求：

- Controller 只做参数接收
- 业务逻辑写 Service
- 数据访问写 Mapper / Repository
- DTO / VO / Entity 分离
- 所有表必须有 created_at / updated_at
- 金额使用 BigDecimal
- Credits 使用 Long
- 删除优先软删除
- 统一返回结构
- 全局异常处理

---

### 11.2 Python

要求：

- Router / Service 分离
- Provider Adapter 分离
- Agent 配置与执行分离
- 不要把模型调用逻辑写死在接口里

---

### 11.3 React

要求：

- 使用 React + Vite + TypeScript
- UI 使用 Mantine
- 状态管理使用 Zustand
- 数据请求使用 Axios + TanStack Query
- 路由使用 React Router
- API 请求统一封装
- 页面按模块拆分
- 不要硬编码后端地址
- 不要使用 Ant Design / Ant Design Pro / Umi
- 不要生成复杂 UI DSL
- 不要过度抽象

---

## 12. 禁止事项

禁止：

- Controller 写复杂逻辑
- 明文保存 API Key
- 跨租户查询
- Python 管理账务
- 前端直接调模型 API
- 平台集中保存客户完整文档
- 平台集中保存文档切片
- 平台集中保存客户向量索引
- 将 EDMS 的文档权限过滤迁移到平台中心化处理
- 一开始引入 Kubernetes
- 一开始拆大量微服务
- 使用 Ant Design Pro
- 使用 Umi
- 使用 ProComponents
- 日志打印密钥
- 日志打印敏感 Prompt 原文
- 无关重构
- 一次性生成过多不可验证代码

---

## 13. 每阶段完成后必须输出

每个阶段完成后必须说明：

1. 修改文件
2. 新增表
3. 新增接口
4. 启动方式
5. 测试方式
6. 已知问题
7. 下一步建议

---

## 14. 当前首个任务

请执行：

```text
Phase 0 + Phase 1
```

目标：

完成项目骨架。

具体要求：

1. 创建 monorepo
2. 创建 Spring Boot 3 主平台
3. 配置 PostgreSQL
4. 配置 Redis
5. 配置 Flyway
6. 创建基础表：
   - tenant
   - tenant_user
   - sys_role
   - sys_user_role
7. 实现：
   - health check
   - 登录接口雏形
   - 租户 CRUD
   - 用户 CRUD
8. 创建 React + Vite + TypeScript + Mantine 管理后台骨架
9. 创建 FastAPI 骨架
10. 创建 Docker Compose
11. 补充 README

先不要开发复杂 AI 功能。

先确保：

- Docker Compose 能启动
- Java 能运行
- React 能运行
- Python 能运行
- PostgreSQL 能连接
- Redis 能连接
- Flyway 能执行

---

## 15. Git 规范

每个 Phase 独立提交。

提交格式：

```text
feat(platform): 初始化 Java 主平台
feat(web): 初始化 React 管理后台
feat(agent): 初始化 FastAPI 服务
feat(wallet): 完成钱包与流水
feat(gateway): 完成 OpenAI-compatible API
```

禁止：

- 一个 commit 修改多个无关模块
- 未测试直接提交
- 修改无关文件
- 自动格式化整个仓库

---

## 16. 文档规范

每新增模块必须同步文档。

docs 目录建议：

```text
docs/
├─ architecture/
├─ api/
├─ database/
├─ deployment/
└─ agent/
```

必须维护：

- API 文档
- 数据库设计
- Docker 启动说明
- 部署说明
- 模块说明

---

## 17. AI Provider Adapter 规范

所有模型供应商必须通过 Adapter 适配。

禁止：

- 在 Controller 中直接调用模型 SDK
- 在业务代码中写死模型供应商
- 在前端直接调用模型供应商 API

统一接口示例：

```java
public interface AiProviderAdapter {

    ChatResponse chat(ChatRequest request);

}
```

实现类：

```text
OpenAiAdapter
DeepSeekAdapter
QwenAdapter
ClaudeAdapter
OllamaAdapter
VllmAdapter
```

Model Router 根据 model_code 找到对应 Provider Adapter。

---

## 18. 前端补充规范

### 18.1 Mantine 使用规范

使用 Mantine 作为主 UI 组件库。

优先使用：

- AppShell
- NavLink
- Card
- Table
- Modal
- Drawer
- Button
- TextInput
- Select
- Badge
- Tabs
- Group
- Stack
- Grid
- Container
- Notification

不要重复造基础组件。

---

### 18.2 图标规范

优先使用：

```text
@tabler/icons-react
```

lucide-react 仅作为补充，不要混乱使用。

---

### 18.3 图表规范

管理后台统计图优先使用：

```text
@mantine/charts
```

复杂图表可使用：

```text
recharts
```

---

### 18.4 Workflow 规范

后续 Agent Workflow 使用：

```text
@logicflow/core
@logicflow/extension
```

第一阶段只预留页面，不做复杂编排。

---

### 18.5 国际化规范

使用：

```text
i18next
react-i18next
```

第一阶段至少预留：

```text
zh-CN
en-US
```

默认语言：

```text
zh-CN
```

---

### 18.6 Excel 导入导出

使用：

```text
xlsx
```

第一阶段可只预留工具方法，不需要复杂导入导出功能。

---

### 18.7 日期处理

统一使用：

```text
dayjs
```

禁止混用 moment。

---

## 19. 首次启动命令建议

完成 Phase 0 + Phase 1 后，README 中至少提供：

```bash
docker compose up -d postgres redis
```

可选文件存储组件：

```bash
docker compose --profile optional-storage up -d minio
```

Java：

```bash
cd apps/platform
mvn spring-boot:run
```

前端：

```bash
cd apps/web
npm install
npm run dev
```

Python：

```bash
cd apps/agent
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 20. 给 Codex 的当前执行指令

请先完整阅读本文件，并严格按照规范执行。

当前只执行：

```text
Phase 0 + Phase 1
```

不要开发复杂 AI、Agent、RAG、Workflow、支付、发票正式对接。

先完成项目骨架、基础表、基础 API、React 管理后台骨架、FastAPI 骨架、Docker Compose 基础服务。

完成后输出：

1. 修改文件列表
2. 新增数据库表
3. 新增接口
4. Docker 启动方式
5. 本地运行方式
6. 测试方式
7. 当前已知问题
8. 下一阶段建议
