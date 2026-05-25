alter table agent_config
    add column if not exists prompt_template_code varchar(128);

create index if not exists idx_agent_config_tenant_prompt_template
    on agent_config (tenant_id, prompt_template_code);
