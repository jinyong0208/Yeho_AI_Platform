# Docker Compose

Phase 6 目标是保证整套 MVP 可以一键启动、健康检查、烟测验证。

启动核心基础设施：

```bash
docker compose up -d postgres redis
```

启动可选 MinIO：

```bash
docker compose --profile optional-storage up -d minio
```

启动全部核心服务：

```bash
docker compose up -d
```

重建并启动全部核心服务：

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
```

服务端口：

| Service | Port |
| --- | --- |
| platform | `8080` |
| web | `5173` |
| agent | `8000` |
| postgres | `5432` |
| redis | `6379` |
| minio | `9000` optional |
| minio console | `9001` optional |

Java 平台通过环境变量连接 Compose 网络内的 `postgres` 和 `redis`。

Web 容器使用 Nginx 托管静态资源，并把 `/api/` 代理到 `platform:8080`。

## Healthcheck

Compose 已为核心服务配置健康检查：

- `postgres`: `pg_isready`
- `redis`: `redis-cli ping`
- `minio`: `mc ready local`，仅在启用 `optional-storage` profile 时运行
- `agent`: `GET /api/v1/health`
- `platform`: `GET /actuator/health`
- `web`: `GET /`

`platform` 会等待 `postgres`、`redis`、`agent` 就绪后启动，`web` 会等待 `platform` 就绪后启动。

## Smoke Test

Windows PowerShell：

```powershell
.\scripts\smoke-all.ps1
```

覆盖：

- Platform health
- Agent health
- Web HTTP 访问
- 管理员登录
- Provider / Model 列表
- Wallet 查询
- `POST /v1/chat/completions`
- Python Agent Demo
- Java Agent Bridge
