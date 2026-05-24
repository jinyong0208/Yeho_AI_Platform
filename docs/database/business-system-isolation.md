# 业务系统隔离表结构

## business_system

登记租户下接入平台的业务系统，只保存系统元数据。

字段：

- `id`
- `tenant_id`
- `system_code`
- `system_name`
- `description`
- `status`
- `created_at`
- `updated_at`

唯一约束：

- `(tenant_id, system_code)`

## tenant_api_key 新增字段

- `allowed_system_codes`
- `allowed_data_domains`

为空表示不额外限制。配置后，网关请求必须携带匹配的 `X-Yeho-System-Code` / `X-Yeho-Data-Domain`。

## ai_usage_log 新增字段

- `system_code`
- `data_domain`
- `agent_code`

用于观测和计费分析，不保存客户数据或 Prompt 原文。

## agent_config / agent_execute_log 新增字段

`agent_config`：

- `system_code`
- `data_domain`
- `allowed_data_domains`

`agent_execute_log`：

- `system_code`
- `data_domain`

这些字段只用于配置归属与 trace 查询，不代表平台保存业务数据。
