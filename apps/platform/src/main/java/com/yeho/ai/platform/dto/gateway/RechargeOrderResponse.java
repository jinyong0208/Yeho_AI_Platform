package com.yeho.ai.platform.dto.gateway;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RechargeOrderResponse(
    Long id,
    Long tenantId,
    String orderNo,
    BigDecimal amountCny,
    Long credits,
    String status,
    String payChannel,
    LocalDateTime paidAt,
    String remark,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
