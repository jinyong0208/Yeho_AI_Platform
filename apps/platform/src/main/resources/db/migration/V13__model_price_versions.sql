create table if not exists ai_model_price_version (
    id bigint primary key,
    model_id bigint not null,
    version_no integer not null,
    input_price numeric(20, 8) not null default 0,
    output_price numeric(20, 8) not null default 0,
    input_credit_rate numeric(20, 8) not null default 0,
    output_credit_rate numeric(20, 8) not null default 0,
    billing_multiplier numeric(20, 8) not null default 1,
    effective_at timestamp not null default now(),
    remark varchar(500),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create unique index if not exists uk_ai_model_price_version_model_no
    on ai_model_price_version(model_id, version_no);

create index if not exists idx_ai_model_price_version_model_time
    on ai_model_price_version(model_id, effective_at desc);

alter table ai_model
    add column if not exists current_price_version_id bigint;

alter table ai_usage_log
    add column if not exists price_version_id bigint;

with seeded as (
    select
        (900000000000000000 + row_number() over (order by id))::bigint as id,
        id as model_id,
        coalesce(input_price, 0) as input_price,
        coalesce(output_price, 0) as output_price,
        coalesce(input_credit_rate, 0) as input_credit_rate,
        coalesce(output_credit_rate, 0) as output_credit_rate,
        coalesce(billing_multiplier, 1) as billing_multiplier,
        coalesce(created_at, now()) as effective_at
    from ai_model
    where current_price_version_id is null
)
insert into ai_model_price_version (
    id,
    model_id,
    version_no,
    input_price,
    output_price,
    input_credit_rate,
    output_credit_rate,
    billing_multiplier,
    effective_at,
    remark,
    created_at,
    updated_at
)
select
    id,
    model_id,
    1,
    input_price,
    output_price,
    input_credit_rate,
    output_credit_rate,
    billing_multiplier,
    effective_at,
    'Initial price version from ai_model',
    now(),
    now()
from seeded
on conflict (model_id, version_no) do nothing;

update ai_model m
set current_price_version_id = pv.id
from ai_model_price_version pv
where pv.model_id = m.id
  and pv.version_no = (
      select max(version_no)
      from ai_model_price_version
      where model_id = m.id
  )
  and m.current_price_version_id is null;

update ai_usage_log l
set price_version_id = m.current_price_version_id
from ai_model m
where m.model_code = l.model_code
  and l.price_version_id is null;
