package com.yeho.ai.platform.dto.gateway;

import lombok.Data;

@Data
public class ProviderTestRequest {
    private String model;
    private String message;
}
