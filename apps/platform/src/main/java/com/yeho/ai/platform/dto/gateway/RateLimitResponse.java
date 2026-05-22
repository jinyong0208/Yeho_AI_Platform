package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;

public record RateLimitResponse(
    Long id,
    Long tenantId,
    Long apiKeyId,
    Integer rpmLimit,
    Integer tpmLimit,
    Long dailyCreditsLimit,
    Integer maxConcurrent,
    String status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
