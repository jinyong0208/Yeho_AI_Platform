package com.yeho.ai.platform.dto.gateway;

import lombok.Data;

@Data
public class ProviderUpdateRequest {
    private String providerName;
    private String baseUrl;
    private String apiKey;
    private String status;
    private Integer timeoutMs;
    private Integer retryCount;
    private Integer circuitFailureThreshold;
    private Integer circuitCooldownSeconds;
    private String fallbackModelCode;
}
