# Frontend Guidelines

## Product Feel

The web console should feel like an enterprise AI Runtime Console:

- Clean, modern, lightweight
- Dense enough for operations, but not old-style ERP
- Similar direction: OpenWebUI, LangSmith, Vercel Dashboard, Cursor Dashboard, Dify Console, OpenAI Platform, Anthropic Console, DeepSeek developer platform

Avoid:

- Traditional ERP/OA style
- Heavy borders
- Heavy tables
- Old admin layouts
- Decorative marketing hero pages for product console screens
- Low-code builder visual language

## Stack

Use:

- React 19
- Vite
- TypeScript
- Mantine UI/Form/Modals/Notifications/Charts
- React Router
- TanStack Query
- Axios
- Zustand
- LogicFlow only for preview/reserved workflow UI
- Tabler Icons first
- i18next and react-i18next
- Dayjs
- Recharts only when needed

Do not use:

- Ant Design
- Ant Design Pro
- ProComponents
- Umi
- dva
- qiankun
- OnlyOffice document editor

## i18n

Default language: `zh-CN`.

Rules:

- All visible UI strings go through i18next.
- Do not hardcode Chinese or English product copy in page components.
- Keep `en-US` structure available, even if some values are placeholders.
- Allowed English technical terms in Chinese UI: API, API Key, Credits, Prompt, Agent, Workflow, Playground, Provider, Runtime, Token.

Recommended Chinese menu naming:

- Dashboard -> 控制台
- Usage -> 调用统计
- API Docs -> API 文档
- Provider Health -> 模型供应商状态
- Provider Analytics -> Provider 分析
- Billing Analytics -> 计费分析
- Agent Logs -> Agent 日志
- Gateway Health -> 网关状态
- Credits Burn -> Credits 消耗
- Top Models -> 热门模型
- Error Rate -> 错误率

## Role-Based Navigation

SUPER_ADMIN may see platform-level pages:

- 租户管理
- Provider 管理
- Provider 分析
- 计费分析
- Provider Health
- 全局审计
- 限流配置
- API Key Scope
- Billing Analytics

TENANT_ADMIN may see tenant operation pages:

- 控制台
- 用户管理
- API Key
- Wallet
- Wallet Logs
- Usage Logs
- Prompt Templates
- Agent Configs
- Agent Execute Logs

TENANT_ADMIN must not see platform Provider configuration, Provider Cost, Profit Dashboard, global audit, or global rate-limit pages.

DEVELOPER should stay simple:

- 控制台
- API Keys
- Usage
- Playground
- API Docs

FINANCE should focus on wallet, billing, invoices, and analytics allowed to the tenant.

VIEWER should be read-only and limited to dashboard, usage, and docs-style pages.

