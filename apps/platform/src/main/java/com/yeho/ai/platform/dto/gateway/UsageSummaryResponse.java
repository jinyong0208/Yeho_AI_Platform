package com.yeho.ai.platform.dto.gateway;

import java.math.BigDecimal;

public record UsageSummaryResponse(
    Long tenantId,
    Long requestCount,
    Long successCount,
    Long failureCount,
    Long inputTokens,
    Long outputTokens,
    Long totalTokens,
    Long chargeCredits,
    BigDecimal realCost,
    BigDecimal profit
) {
}
