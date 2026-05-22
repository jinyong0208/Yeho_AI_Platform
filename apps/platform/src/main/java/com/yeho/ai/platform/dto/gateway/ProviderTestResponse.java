package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;

public record ProviderTestResponse(
    Long providerId,
    String providerCode,
    String modelCode,
    boolean success,
    String code,
    String message,
    Long latencyMs,
    LocalDateTime testedAt
) {
}
