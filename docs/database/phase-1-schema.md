# Phase 1 Database Schema

Flyway migration:

- `apps/platform/src/main/resources/db/migration/V1__init_core_tables.sql`

新增表：

| Table | Purpose |
| --- | --- |
| `tenant` | 租户基础信息 |
| `tenant_user` | 租户内用户 |
| `sys_role` | 系统角色 |
| `sys_user_role` | 用户角色关系 |

## tenant

核心字段：

- `id`
- `tenant_code`
- `tenant_name`
- `status`
- `contact_name`
- `contact_phone`
- `contact_email`
- `created_at`
- `updated_at`

## tenant_user

核心字段：

- `id`
- `tenant_id`
- `username`
- `password_hash`
- `display_name`
- `email`
- `phone`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

`tenant_id + username` 唯一，避免同一租户内重名。

## sys_role

初始化角色：

- `SUPER_ADMIN`
- `TENANT_ADMIN`
- `DEVELOPER`
- `FINANCE`
- `VIEWER`

## sys_user_role

用户角色关系表，`user_id + role_id` 唯一。
