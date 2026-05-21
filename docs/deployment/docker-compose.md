# Docker Compose

启动基础设施：

```bash
docker compose up -d postgres redis minio
```

启动全部服务：

```bash
docker compose up -d
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
| minio | `9000` |
| minio console | `9001` |

Java 平台通过环境变量连接 Compose 网络内的 `postgres` 和 `redis`。

Web 容器使用 Nginx 托管静态资源，并把 `/api/` 代理到 `platform:8080`。
