package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;

public record ApiKeyResponse(
    Long id,
    Long tenantId,
    String apiKeyPrefix,
    String name,
    String status,
    LocalDateTime expiredAt,
    LocalDateTime createdAt,
    LocalDateTime lastUsedAt
) {
}
