package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;

public record WalletResponse(
    Long tenantId,
    Long balanceCredits,
    Long frozenCredits,
    Long totalRechargeCredits,
    Long totalUsedCredits,
    LocalDateTime updatedAt
) {
}
