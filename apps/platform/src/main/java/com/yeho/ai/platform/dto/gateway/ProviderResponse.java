package com.yeho.ai.platform.dto.gateway;

import java.time.LocalDateTime;

public record ProviderResponse(
    Long id,
    String providerCode,
    String providerName,
    String baseUrl,
    String status,
    boolean hasApiKey,
    Integer timeoutMs,
    Integer retryCount,
    Integer circuitFailureThreshold,
    Integer circuitCooldownSeconds,
    String fallbackModelCode,
    String healthStatus,
    Integer consecutiveFailures,
    LocalDateTime circuitOpenUntil,
    LocalDateTime lastCheckedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
