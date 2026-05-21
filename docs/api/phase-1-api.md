# Phase 1 API

统一前缀：`/api/v1`

## Health

```http
GET /api/v1/health
```

无需登录。

## Auth

```http
POST /api/v1/auth/login
Content-Type: application/json
```

请求：

```json
{
  "tenantCode": "default",
  "username": "admin",
  "password": "Admin@123456"
}
```

返回包含 `accessToken`，后续管理接口使用：

```http
Authorization: Bearer <accessToken>
```

## Tenant CRUD

```http
GET    /api/v1/tenants
POST   /api/v1/tenants
GET    /api/v1/tenants/{id}
PUT    /api/v1/tenants/{id}
DELETE /api/v1/tenants/{id}
```

`DELETE` 为软删除，实际将 `status` 更新为 `DELETED`。

## Tenant User CRUD

```http
GET    /api/v1/tenants/{tenantId}/users
POST   /api/v1/tenants/{tenantId}/users
GET    /api/v1/tenants/{tenantId}/users/{userId}
PUT    /api/v1/tenants/{tenantId}/users/{userId}
DELETE /api/v1/tenants/{tenantId}/users/{userId}
```

用户接口始终带 `tenantId`，避免跨租户操作入口不清晰。
