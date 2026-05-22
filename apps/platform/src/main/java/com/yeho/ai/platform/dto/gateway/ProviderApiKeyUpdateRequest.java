package com.yeho.ai.platform.dto.gateway;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ProviderApiKeyUpdateRequest {
    @NotBlank
    private String apiKey;
}
