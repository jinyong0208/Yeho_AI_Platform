package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;

public record ProviderResponse(
    Long id,
    String providerCode,
    String providerName,
    String baseUrl,
    String status,
    boolean hasApiKey,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
