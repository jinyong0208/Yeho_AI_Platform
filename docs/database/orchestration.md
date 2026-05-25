# Orchestration Tables

The orchestration tables store Prompt and Agent configuration metadata only.

Yeho AI Platform must not centrally store customer documents, document chunks, or vector indexes in these tables.

## prompt_template

Stores editable Prompt Template drafts and current content.

Important fields:

- `tenant_id`
- `template_code`
- `template_name`
- `description`
- `content`
- `status`

Supported statuses:

- `DRAFT`
- `PUBLISHED`
- `DISABLED`

## prompt_version

Stores immutable snapshots created when a Prompt Template is published.

Important fields:

- `tenant_id`
- `template_id`
- `version_no`
- `content`
- `status`
- `published_at`

## agent_config

Stores basic Agent configuration.

Important fields:

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

This table does not define Tool Calling Runtime, Workflow Runtime, or multi-agent autonomy.

## agent_execute_log

Stores execution metadata for trace and audit queries.

Important fields:

- `request_id`
- `tenant_id`
- `agent_config_id`
- `agent_code`
- `model`
- `latency_ms`
- token usage fields
- `charge_credits`
- `success`
- `error_code`
- `error_message`
- `trace_id`

Sensitive Prompt text and customer document content should not be stored here.
