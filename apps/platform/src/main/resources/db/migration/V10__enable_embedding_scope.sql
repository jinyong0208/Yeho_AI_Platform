alter table tenant_api_key
    alter column scopes set default 'chat:completion,embedding:create,usage:read,billing:read';

update tenant_api_key
set scopes = concat(scopes, ',embedding:create')
where scopes not like '%embedding:create%';

insert into ai_model (
    id, provider_id, model_code, display_name,
    input_price, output_price, input_credit_rate, output_credit_rate,
    billing_multiplier, support_stream, support_tool_call, status
)
select
    extract(epoch from clock_timestamp())::bigint * 1000000,
    p.id,
    'text-embedding-v4',
    'Qwen Text Embedding v4',
    0,
    0,
    0,
    0,
    1,
    false,
    false,
    'ACTIVE'
from ai_provider p
where p.provider_code = 'QWEN'
  and not exists (select 1 from ai_model where model_code = 'text-embedding-v4');
