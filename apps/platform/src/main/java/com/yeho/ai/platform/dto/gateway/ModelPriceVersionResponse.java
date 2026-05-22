package com.yeho.ai.platform.dto.gateway;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ModelPriceVersionResponse(
    Long id,
    Long modelId,
    Integer versionNo,
    BigDecimal inputPrice,
    BigDecimal outputPrice,
    BigDecimal inputCreditRate,
    BigDecimal outputCreditRate,
    BigDecimal billingMultiplier,
    LocalDateTime effectiveAt,
    String remark,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
