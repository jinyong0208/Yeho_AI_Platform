package com.yeho.ai.platform.dto.gateway;

import java.math.BigDecimal;
import java.util.List;

public record CostSummaryResponse(
        Integer days,
        Long requests,
        Long successRequests,
        Long inputTokens,
        Long outputTokens,
        Long totalTokens,
        Long credits,
        BigDecimal cost,
        BigDecimal profit,
        List<CostMetricResponse> daily,
        List<CostMetricResponse> providers,
        List<CostMetricResponse> models,
        List<CostMetricResponse> tenants,
        List<CostMetricResponse> apiKeys
) {
}
