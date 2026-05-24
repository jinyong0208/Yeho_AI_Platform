create table if not exists business_system (
    id bigint primary key,
    tenant_id bigint not null references tenant(id),
    system_code varchar(128) not null,
    system_name varchar(255) not null,
    description varchar(1000),
    status varchar(32) not null default 'ACTIVE',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (tenant_id, system_code)
);

create index if not exists idx_business_system_tenant_status on business_system (tenant_id, status);

alter table tenant_api_key
    add column if not exists allowed_system_codes varchar(1024),
    add column if not exists allowed_data_domains varchar(1024);

alter table ai_usage_log
    add column if not exists system_code varchar(128),
    add column if not exists data_domain varchar(128),
    add column if not exists agent_code varchar(128);

create index if not exists idx_ai_usage_log_tenant_system_created
    on ai_usage_log (tenant_id, system_code, created_at desc);

create index if not exists idx_ai_usage_log_tenant_data_domain_created
    on ai_usage_log (tenant_id, data_domain, created_at desc);

create index if not exists idx_ai_usage_log_tenant_agent_created
    on ai_usage_log (tenant_id, agent_code, created_at desc);

alter table agent_config
    add column if not exists system_code varchar(128),
    add column if not exists data_domain varchar(128),
    add column if not exists allowed_data_domains varchar(1024);

create index if not exists idx_agent_config_tenant_system
    on agent_config (tenant_id, system_code);

alter table agent_execute_log
    add column if not exists system_code varchar(128),
    add column if not exists data_domain varchar(128);

create index if not exists idx_agent_execute_log_tenant_system_created
    on agent_execute_log (tenant_id, system_code, created_at desc);
