package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;

public record ApiKeyCreateResponse(
    Long id,
    Long tenantId,
    String apiKey,
    String apiKeyPrefix,
    String name,
    String status,
    LocalDateTime expiredAt,
    LocalDateTime createdAt
) {
}
