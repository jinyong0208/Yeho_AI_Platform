package com.yeho.ai.platform.dto.gateway;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ProviderCreateRequest {
    @NotBlank
    private String providerCode;

    @NotBlank
    private String providerName;

    @NotBlank
    private String baseUrl;

    private String apiKey;
    private String status;
}
