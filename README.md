# Yeho AI Platform

企业级 AI 中台 / AI Gateway / Agent Platform。

当前已完成第一阶段 MVP 主链路：多租户、登录、AI Gateway、模型供应商/模型配置、API Key、钱包/充值/扣费、Usage Log、React 控制台、Python LangGraph Demo Agent、Docker Compose 一键启动。

## 目录结构

```text
apps/
  platform/  Spring Boot 3 主平台
  web/       React + Vite + TypeScript + Mantine 管理后台
  agent/     FastAPI + LangGraph AI 服务
docs/
  architecture/
  api/
  database/
  deployment/
  agent/
```

## Docker 启动

先启动基础设施：

```bash
docker compose up -d postgres redis minio
```

一键启动全部服务：

```bash
docker compose up -d
```

重建并启动全部服务：

```bash
docker compose up -d --build
```

服务端口：

- Java 平台：http://localhost:8080
- Web 控制台：http://localhost:5173
- Python Agent：http://localhost:8000
- MinIO 控制台：http://localhost:9001

## 本地运行

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

## 默认账号

平台首次启动时会创建默认租户和超级管理员：

- 租户编码：`default`
- 用户名：`admin`
- 密码：`Admin@123456`

生产环境请通过环境变量 `YEHO_SECURITY_DEFAULT_ADMIN_PASSWORD` 覆盖默认密码，并在首次登录后修改。

## 快速验证

```bash
curl http://localhost:8080/api/v1/health
curl http://localhost:8000/api/v1/health
```

登录接口：

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"tenantCode\":\"default\",\"username\":\"admin\",\"password\":\"Admin@123456\"}"
```

获取到 token 后访问管理 API：

```bash
curl http://localhost:8080/api/v1/tenants \
  -H "Authorization: Bearer <token>"
```

OpenAI-compatible API：

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer yh_sk_demo_default_key" \
  -d "{\"model\":\"deepseek-chat\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello gateway\"}],\"temperature\":0.2,\"max_tokens\":16,\"stream\":false}"
```

Python Agent Demo：

```bash
curl -X POST http://localhost:8000/api/v1/agents/demo/run \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"check wallet credits\",\"tenantId\":\"1\",\"userId\":\"1\"}"
```

Windows PowerShell 烟测脚本：

```powershell
.\scripts\smoke-all.ps1
.\scripts\smoke-phase1.ps1
.\scripts\smoke-agent.ps1
```

更多说明见 `docs/`。
