insert into agent_execute_log (
    id,
    request_id,
    tenant_id,
    system_code,
    data_domain,
    agent_code,
    model,
    latency_ms,
    input_tokens,
    output_tokens,
    total_tokens,
    charge_credits,
    success,
    error_code,
    error_message,
    trace_id,
    created_at
)
select
    u.id,
    u.request_id,
    u.tenant_id,
    u.system_code,
    u.data_domain,
    u.agent_code,
    u.model_code,
    u.latency_ms,
    coalesce(u.input_tokens, 0),
    coalesce(u.output_tokens, 0),
    coalesce(u.total_tokens, 0),
    coalesce(u.charge_credits, 0),
    coalesce(u.success, false),
    u.error_code,
    u.error_message,
    u.request_id,
    u.created_at
from ai_usage_log u
where u.agent_code is not null
  and u.agent_code <> ''
  and not exists (
      select 1
      from agent_execute_log l
      where l.request_id = u.request_id
        and l.tenant_id = u.tenant_id
        and l.agent_code = u.agent_code
  )
on conflict (id) do nothing;
