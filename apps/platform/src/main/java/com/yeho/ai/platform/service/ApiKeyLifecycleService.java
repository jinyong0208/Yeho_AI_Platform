package com.yeho.ai.platform.service;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ApiKeyLifecycleService {

    private static final int DEFAULT_USAGE_DAYS = 30;
    private static final int MAX_USAGE_DAYS = 365;

    private final JdbcTemplate jdbcTemplate;

    public ApiKeyLifecycleService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> disable(Long apiKeyId) {
        return updateStatus(apiKeyId, "DISABLED");
    }

    public Map<String, Object> enable(Long apiKeyId) {
        return updateStatus(apiKeyId, "ACTIVE");
    }

    public Map<String, Object> usageSummary(Long apiKeyId, Integer days) {
        Long tenantId = currentTenantId();
        int normalizedDays = normalizeDays(days);
        Map<String, Object> apiKey = loadApiKey(apiKeyId, tenantId);
        Map<String, Object> summary = jdbcTemplate.queryForMap("""
                select count(*)::bigint as request_count,
                       coalesce(sum(input_tokens), 0)::bigint as input_tokens,
                       coalesce(sum(output_tokens), 0)::bigint as output_tokens,
                       coalesce(sum(total_tokens), 0)::bigint as total_tokens,
                       coalesce(sum(charge_credits), 0)::bigint as charge_credits,
                       coalesce(sum(real_cost), 0) as real_cost,
                       coalesce(sum(profit), 0) as profit,
                       coalesce(sum(case when success then 1 else 0 end), 0)::bigint as success_count,
                       coalesce(sum(case when success then 0 else 1 end), 0)::bigint as failure_count,
                       max(created_at) as last_called_at
                from ai_usage_log
                where tenant_id = ?
                  and api_key_id = ?
                  and created_at >= now() - (? || ' days')::interval
                """, tenantId, apiKeyId, normalizedDays);
        List<Map<String, Object>> daily = jdbcTemplate.queryForList("""
                select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
                       count(*)::bigint as request_count,
                       coalesce(sum(total_tokens), 0)::bigint as total_tokens,
                       coalesce(sum(charge_credits), 0)::bigint as charge_credits,
                       coalesce(sum(case when success then 1 else 0 end), 0)::bigint as success_count,
                       coalesce(sum(case when success then 0 else 1 end), 0)::bigint as failure_count
                from ai_usage_log
                where tenant_id = ?
                  and api_key_id = ?
                  and created_at >= now() - (? || ' days')::interval
                group by date_trunc('day', created_at)
                order by day desc
                limit 60
                """, tenantId, apiKeyId, normalizedDays);
        return Map.of(
                "apiKey", apiKey,
                "days", normalizedDays,
                "summary", summary,
                "daily", daily
        );
    }

    private Map<String, Object> updateStatus(Long apiKeyId, String status) {
        Long tenantId = currentTenantId();
        int updated = jdbcTemplate.update("""
                update tenant_api_key
                set status = ?,
                    last_used_at = last_used_at
                where id = ?
                  and tenant_id = ?
                """, status, apiKeyId, tenantId);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "API key not found");
        }
        return loadApiKey(apiKeyId, tenantId);
    }

    private Map<String, Object> loadApiKey(Long apiKeyId, Long tenantId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select id,
                       tenant_id,
                       api_key_prefix,
                       name,
                       status,
                       expired_at,
                       created_at,
                       last_used_at,
                       scopes
                from tenant_api_key
                where id = ?
                  and tenant_id = ?
                limit 1
                """, apiKeyId, tenantId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "API key not found");
        }
        return rows.get(0);
    }

    private Long currentTenantId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authentication required");
        }
        String username = authentication.getName();
        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authentication required");
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select tenant_id
                from tenant_user
                where username = ?
                  and status = 'ACTIVE'
                limit 1
                """, username);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tenant user not found");
        }
        Object tenantId = rows.get(0).get("tenant_id");
        if (tenantId instanceof Number number) {
            return number.longValue();
        }
        return Long.valueOf(String.valueOf(tenantId));
    }

    private int normalizeDays(Integer days) {
        if (days == null) {
            return DEFAULT_USAGE_DAYS;
        }
        if (days < 1) {
            return 1;
        }
        return Math.min(days, MAX_USAGE_DAYS);
    }
}
