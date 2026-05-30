# Orchestration Tables

编排模块只保存 Prompt、Agent、Workflow 的配置和执行元数据。

Yeho AI Platform 不集中保存客户完整文档、文档切片、向量索引或业务原始数据。

## prompt_template

保存 Prompt Template 草稿和当前内容。

核心字段：

- `tenant_id`
- `template_code`
- `template_name`
- `description`
- `content`
- `status`

状态：

- `DRAFT`
- `PUBLISHED`
- `DISABLED`

## prompt_version

Prompt Template 发布时生成的不可变快照。

核心字段：

- `tenant_id`
- `template_id`
- `version_no`
- `content`
- `status`
- `published_at`

## agent_config

保存 Agent 基础配置。

核心字段：

- `tenant_id`
- `system_code`
- `data_domain`
- `allowed_data_domains`
- `agent_code`
- `prompt_template_code`
- `agent_name`
- `system_prompt`
- `default_model`
- `temperature`
- `max_tokens`
- `status`

该表不定义 Tool Calling Runtime、Workflow Runtime 或多 Agent 自治。

## workflow_definition

保存 Workflow 预览配置。Workflow 第一阶段只是配置中心，不是执行引擎。

核心字段：

- `tenant_id`
- `workflow_code`
- `workflow_name`
- `description`
- `system_code`
- `data_domain`
- `agent_code`
- `default_model`
- `schema_json`
- `status`
- `current_version_no`
- `created_at`
- `updated_at`

约束：

- 同一租户下 `workflow_code` 唯一。
- `schema_json` 只保存流程配置，不保存客户文档、切片、检索结果或向量。

## workflow_version

Workflow 发布时生成的版本快照。

核心字段：

- `tenant_id`
- `workflow_id`
- `workflow_code`
- `workflow_name`
- `description`
- `system_code`
- `data_domain`
- `agent_code`
- `default_model`
- `version_no`
- `schema_json`
- `status`
- `published_at`
- `created_at`

约束：

- 同一 Workflow 下 `version_no` 唯一。
- 版本内容用于业务系统读取配置，不触发平台内节点执行。

## agent_execute_log

保存 Agent / Workflow 调用轨迹元数据。

核心字段：

- `request_id`
- `tenant_id`
- `agent_config_id`
- `system_code`
- `data_domain`
- `workflow_code`
- `agent_code`
- `model`
- `latency_ms`
- Token 用量字段
- `charge_credits`
- `success`
- `error_code`
- `error_message`
- `trace_id`

敏感 Prompt 原文、客户文档内容、切片内容和向量不得写入该表。

## ai_usage_log workflow_code

`ai_usage_log` 增加 `workflow_code` 字段，用于把网关调用、计费、Token、成本和利润统计关联到具体 Workflow。

该字段只记录流程编码，不保存流程执行输入、客户文档、检索结果或 Prompt 原文。
