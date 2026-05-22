package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;
import java.util.Set;

public record ApiKeyResponse(
    Long id,
    Long tenantId,
    String apiKeyPrefix,
    String name,
    Set<String> scopes,
    String status,
    LocalDateTime expiredAt,
    LocalDateTime createdAt,
    LocalDateTime lastUsedAt
) {
}
