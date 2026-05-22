CREATE TABLE IF NOT EXISTS sys_audit_log (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT,
    user_id BIGINT,
    username VARCHAR(64),
    roles VARCHAR(512),
    request_id VARCHAR(64),
    action VARCHAR(32) NOT NULL,
    resource_type VARCHAR(64),
    resource_id VARCHAR(128),
    method VARCHAR(16) NOT NULL,
    path VARCHAR(512) NOT NULL,
    query_string VARCHAR(1024),
    status_code INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    latency_ms BIGINT NOT NULL,
    ip VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_audit_log_tenant_id ON sys_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sys_audit_log_user_id ON sys_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sys_audit_log_request_id ON sys_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_sys_audit_log_resource_type ON sys_audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_sys_audit_log_created_at ON sys_audit_log(created_at);
