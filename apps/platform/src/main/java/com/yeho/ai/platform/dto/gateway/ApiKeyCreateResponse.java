package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;
import java.util.Set;

public record ApiKeyCreateResponse(
    Long id,
    Long tenantId,
    String apiKey,
    String apiKeyPrefix,
    String name,
    Set<String> scopes,
    String status,
    LocalDateTime expiredAt,
    LocalDateTime createdAt
) {
}
