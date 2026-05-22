package com.yeho.ai.platform.dto.gateway;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UsageLogResponse(
    Long id,
    Long tenantId,
    Long apiKeyId,
    String providerCode,
    String modelCode,
    String requestId,
    Integer inputTokens,
    Integer outputTokens,
    Integer totalTokens,
    BigDecimal realCost,
    Long chargeCredits,
    BigDecimal profit,
    Long latencyMs,
    Boolean success,
    String errorCode,
    String errorMessage,
    String promptSummary,
    LocalDateTime createdAt
) {
}
