# Security And Audit

This module adds the first RBAC and audit baseline for the management API.

## RBAC

Roles are stored in `sys_role` and attached to login tokens as Spring Security authorities.

Current management policy:

- `SUPER_ADMIN`: global tenant, provider, model, audit, billing, usage access.
- `TENANT_ADMIN`: tenant-scoped user, API key, wallet, and usage access.
- `DEVELOPER`: tenant-scoped API key, wallet read, and usage access.
- `FINANCE`: tenant-scoped wallet, recharge order, and usage access.
- `VIEWER`: tenant-scoped usage access.

Provider, model, tenant, and audit-log APIs are reserved for `SUPER_ADMIN`.

## Tenant Boundary

Tenant-scoped APIs validate the authenticated user's tenant before reading or mutating data. Non-super-admin users cannot pass another `tenantId` in path or query parameters.

## Audit Log

New table:

- `sys_audit_log`

New API:

- `GET /api/v1/audit-logs`

Only `SUPER_ADMIN` can query audit logs.

The audit filter records:

- `tenant_id`
- `user_id`
- `username`
- `roles`
- `request_id`
- `method`
- `path`
- sanitized `query_string`
- `action`
- `resource_type`
- `resource_id`
- `status_code`
- `success`
- `latency_ms`
- `ip`
- `user_agent`

The audit filter does not read or store request bodies, so prompts, provider keys, tenant API keys, and passwords are not persisted by the audit log.
