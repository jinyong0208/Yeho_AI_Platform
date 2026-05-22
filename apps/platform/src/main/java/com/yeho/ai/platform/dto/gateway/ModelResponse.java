package com.yeho.ai.platform.dto.gateway;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ModelResponse(
    Long id,
    Long providerId,
    String providerCode,
    String modelCode,
    String displayName,
    BigDecimal inputPrice,
    BigDecimal outputPrice,
    BigDecimal inputCreditRate,
    BigDecimal outputCreditRate,
    BigDecimal billingMultiplier,
    Boolean supportStream,
    Boolean supportToolCall,
    String status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
