package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;

public record WalletLogResponse(
    Long id,
    Long tenantId,
    String bizType,
    String bizId,
    String direction,
    Long amountCredits,
    Long balanceAfter,
    String remark,
    LocalDateTime createdAt
) {
}
