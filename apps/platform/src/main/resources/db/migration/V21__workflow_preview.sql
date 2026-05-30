create table if not exists workflow_definition (
    id bigint primary key,
    tenant_id bigint not null references tenant(id),
    workflow_code varchar(128) not null,
    workflow_name varchar(255) not null,
    description varchar(1000),
    system_code varchar(128),
    data_domain varchar(128),
    agent_code varchar(128),
    default_model varchar(128),
    schema_json text not null,
    status varchar(32) not null default 'DRAFT',
    current_version_no integer,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (tenant_id, workflow_code)
);

create index if not exists idx_workflow_definition_tenant_status
    on workflow_definition (tenant_id, status);

create table if not exists workflow_version (
    id bigint primary key,
    tenant_id bigint not null references tenant(id),
    workflow_id bigint not null references workflow_definition(id),
    workflow_code varchar(128) not null,
    workflow_name varchar(255) not null,
    description varchar(1000),
    system_code varchar(128),
    data_domain varchar(128),
    agent_code varchar(128),
    default_model varchar(128),
    version_no integer not null,
    schema_json text not null,
    status varchar(32) not null default 'PUBLISHED',
    published_at timestamp,
    created_at timestamp not null default now(),
    unique (workflow_id, version_no)
);

create index if not exists idx_workflow_version_tenant_code
    on workflow_version (tenant_id, workflow_code);

alter table ai_usage_log
    add column if not exists workflow_code varchar(128);

create index if not exists idx_ai_usage_log_tenant_workflow
    on ai_usage_log (tenant_id, workflow_code, created_at);

alter table agent_execute_log
    add column if not exists workflow_code varchar(128);

create index if not exists idx_agent_execute_log_tenant_workflow
    on agent_execute_log (tenant_id, workflow_code, created_at);

alter table tenant_api_key
    alter column scopes set default 'chat:completion,embedding:create,models:read,agent:read,workflow:read,usage:read,billing:read';

update tenant_api_key
set scopes = case
    when scopes is null or trim(scopes) = '' then 'workflow:read'
    when position('workflow:read' in scopes) = 0 and position('admin:*' in scopes) = 0 then scopes || ',workflow:read'
    else scopes
end
where scopes is null
   or position('workflow:read' in scopes) = 0;
