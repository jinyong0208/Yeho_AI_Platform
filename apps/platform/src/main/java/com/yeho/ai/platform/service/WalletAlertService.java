package com.yeho.ai.platform.service;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class WalletAlertService {

    private static final long DEFAULT_THRESHOLD_CREDITS = 10_000L;
    private static final int DEFAULT_LIMIT = 100;

    private final JdbcTemplate jdbcTemplate;

    public WalletAlertService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> listLowBalanceWallets(Long tenantId, Long thresholdCredits, Integer limit) {
        long threshold = thresholdCredits == null ? DEFAULT_THRESHOLD_CREDITS : Math.max(0L, thresholdCredits);
        int safeLimit = normalizeLimit(limit);
        if (tenantId == null) {
            return jdbcTemplate.queryForList("""
                    select t.id as tenant_id,
                           t.tenant_code,
                           t.tenant_name,
                           w.balance_credits,
                           w.frozen_credits,
                           w.total_recharge_credits,
                           w.total_used_credits,
                           w.updated_at
                    from tenant_wallet w
                    join tenant t on t.id = w.tenant_id
                    where w.balance_credits <= ?
                    order by w.balance_credits asc, w.updated_at desc
                    limit ?
                    """, threshold, safeLimit);
        }
        return jdbcTemplate.queryForList("""
                select t.id as tenant_id,
                       t.tenant_code,
                       t.tenant_name,
                       w.balance_credits,
                       w.frozen_credits,
                       w.total_recharge_credits,
                       w.total_used_credits,
                       w.updated_at
                from tenant_wallet w
                join tenant t on t.id = w.tenant_id
                where w.tenant_id = ?
                  and w.balance_credits <= ?
                order by w.balance_credits asc, w.updated_at desc
                limit ?
                """, tenantId, threshold, safeLimit);
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        return Math.max(1, Math.min(limit, 500));
    }
}
