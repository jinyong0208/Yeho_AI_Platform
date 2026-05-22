create table if not exists prompt_template (
    id bigint primary key,
    tenant_id bigint not null,
    template_code varchar(128) not null,
    template_name varchar(255) not null,
    description varchar(1000),
    content text not null,
    status varchar(32) not null default 'DRAFT',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (tenant_id, template_code)
);

create table if not exists prompt_version (
    id bigint primary key,
    tenant_id bigint not null,
    template_id bigint not null,
    version_no integer not null,
    content text not null,
    status varchar(32) not null default 'PUBLISHED',
    published_at timestamp not null default now(),
    created_at timestamp not null default now(),
    unique (template_id, version_no)
);

create table if not exists agent_config (
    id bigint primary key,
    tenant_id bigint not null,
    agent_code varchar(128) not null,
    agent_name varchar(255) not null,
    description varchar(1000),
    system_prompt text,
    default_model varchar(128) not null,
    temperature numeric(6, 3),
    max_tokens integer,
    status varchar(32) not null default 'ACTIVE',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (tenant_id, agent_code)
);

create table if not exists agent_execute_log (
    id bigint primary key,
    request_id varchar(128) not null,
    tenant_id bigint not null,
    agent_config_id bigint,
    agent_code varchar(128),
    model varchar(128),
    latency_ms bigint,
    input_tokens bigint not null default 0,
    output_tokens bigint not null default 0,
    total_tokens bigint not null default 0,
    charge_credits bigint not null default 0,
    success boolean not null default true,
    error_code varchar(128),
    error_message varchar(1000),
    trace_id varchar(128),
    created_at timestamp not null default now()
);

create index if not exists idx_prompt_template_tenant on prompt_template (tenant_id);
create index if not exists idx_prompt_version_template on prompt_version (template_id);
create index if not exists idx_agent_config_tenant on agent_config (tenant_id);
create index if not exists idx_agent_execute_log_tenant_created on agent_execute_log (tenant_id, created_at desc);
create index if not exists idx_agent_execute_log_request on agent_execute_log (request_id);
create index if not exists idx_agent_execute_log_trace on agent_execute_log (trace_id);
