# Security And Audit Schema

## sys_audit_log

`sys_audit_log` stores management API access records for security review and troubleshooting.

Columns:

- `id`
- `tenant_id`
- `user_id`
- `username`
- `roles`
- `request_id`
- `action`
- `resource_type`
- `resource_id`
- `method`
- `path`
- `query_string`
- `status_code`
- `success`
- `latency_ms`
- `ip`
- `user_agent`
- `created_at`
- `updated_at`

Indexes:

- `idx_sys_audit_log_tenant_created`
- `idx_sys_audit_log_user_created`
- `idx_sys_audit_log_request_id`
- `idx_sys_audit_log_resource`

Privacy boundary:

- Request bodies are not stored.
- Prompt text is not stored.
- API keys, provider keys, passwords, tokens, and secrets in query strings are masked.
- Audit writes are best-effort and must not change the original business response.
