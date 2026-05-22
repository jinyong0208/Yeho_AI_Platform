package com.yeho.ai.platform.dto.gateway;

import java.math.BigDecimal;

public record CostMetricResponse(
        String dimension,
        String dimensionName,
        Long requests,
        Long successRequests,
        Long inputTokens,
        Long outputTokens,
        Long totalTokens,
        Long credits,
        BigDecimal cost,
        BigDecimal profit
) {
}
