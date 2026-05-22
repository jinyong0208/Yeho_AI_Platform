package com.yeho.ai.platform.service;

import com.yeho.ai.platform.dto.gateway.CostMetricResponse;
import com.yeho.ai.platform.dto.gateway.CostSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CostAnalyticsService {

    private final JdbcTemplate jdbcTemplate;

    public CostSummaryResponse summary(Integer days) {
        int safeDays = normalizeDays(days);
        Timestamp since = Timestamp.valueOf(LocalDateTime.now().minusDays(safeDays));

        CostMetricResponse total = jdbcTemplate.queryForObject("""
                select
                    'total' as dimension,
                    'Total' as dimension_name,
                    count(*) as requests,
                    coalesce(sum(case when success then 1 else 0 end), 0) as success_requests,
                    coalesce(sum(input_tokens), 0) as input_tokens,
                    coalesce(sum(output_tokens), 0) as output_tokens,
                    coalesce(sum(total_tokens), 0) as total_tokens,
                    coalesce(sum(charge_credits), 0) as credits,
                    coalesce(sum(real_cost), 0) as cost,
                    coalesce(sum(charge_credits), 0) - coalesce(sum(real_cost), 0) as profit
                from ai_usage_log
                where created_at >= ?
                """, this::mapMetric, since);

        return new CostSummaryResponse(
                safeDays,
                total.requests(),
                total.successRequests(),
                total.inputTokens(),
                total.outputTokens(),
                total.totalTokens(),
                total.credits(),
                total.cost(),
                total.profit(),
                groupBy("to_char(created_at::date, 'YYYY-MM-DD')", "to_char(created_at::date, 'YYYY-MM-DD')", since, 30),
                groupBy("provider_code", "provider_code", since, 20),
                groupBy("model_code", "model_code", since, 20),
                groupBy("tenant_id::text", "tenant_id::text", since, 20),
                groupBy("coalesce(api_key_id::text, 'none')", "coalesce(api_key_id::text, 'none')", since, 20)
        );
    }

    public List<CostMetricResponse> providerCosts(Integer days) {
        int safeDays = normalizeDays(days);
        Timestamp since = Timestamp.valueOf(LocalDateTime.now().minusDays(safeDays));
        return groupBy("provider_code", "provider_code", since, 50);
    }

    private List<CostMetricResponse> groupBy(String dimensionExpression, String nameExpression, Timestamp since, int limit) {
        String sql = """
                select
                    %s as dimension,
                    %s as dimension_name,
                    count(*) as requests,
                    coalesce(sum(case when success then 1 else 0 end), 0) as success_requests,
                    coalesce(sum(input_tokens), 0) as input_tokens,
                    coalesce(sum(output_tokens), 0) as output_tokens,
                    coalesce(sum(total_tokens), 0) as total_tokens,
                    coalesce(sum(charge_credits), 0) as credits,
                    coalesce(sum(real_cost), 0) as cost,
                    coalesce(sum(charge_credits), 0) - coalesce(sum(real_cost), 0) as profit
                from ai_usage_log
                where created_at >= ?
                group by 1, 2
                order by credits desc
                limit ?
                """.formatted(dimensionExpression, nameExpression);
        return jdbcTemplate.query(sql, this::mapMetric, since, limit);
    }

    private CostMetricResponse mapMetric(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new CostMetricResponse(
                rs.getString("dimension"),
                rs.getString("dimension_name"),
                rs.getLong("requests"),
                rs.getLong("success_requests"),
                rs.getLong("input_tokens"),
                rs.getLong("output_tokens"),
                rs.getLong("total_tokens"),
                rs.getLong("credits"),
                rs.getBigDecimal("cost") == null ? BigDecimal.ZERO : rs.getBigDecimal("cost"),
                rs.getBigDecimal("profit") == null ? BigDecimal.ZERO : rs.getBigDecimal("profit")
        );
    }

    private int normalizeDays(Integer days) {
        if (days == null || days < 1) {
            return 7;
        }
        return Math.min(days, 90);
    }
}
