create table if not exists provider_test_log (
    id bigint primary key,
    provider_id bigint not null,
    provider_code varchar(64) not null,
    request_id varchar(64) not null,
    success boolean not null,
    latency_ms bigint not null default 0,
    error_code varchar(64),
    error_message varchar(500),
    tested_at timestamp not null default now()
);

create index if not exists idx_provider_test_log_provider_time
    on provider_test_log(provider_id, tested_at desc);

create index if not exists idx_provider_test_log_request
    on provider_test_log(request_id);
