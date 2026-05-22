package com.yeho.ai.platform.dto.gateway;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ModelCreateRequest {
    @NotNull
    private Long providerId;

    @NotBlank
    private String modelCode;

    @NotBlank
    private String displayName;

    private BigDecimal inputPrice = BigDecimal.ZERO;
    private BigDecimal outputPrice = BigDecimal.ZERO;
    private BigDecimal inputCreditRate = BigDecimal.ZERO;
    private BigDecimal outputCreditRate = BigDecimal.ZERO;
    private BigDecimal billingMultiplier = BigDecimal.ONE;
    private Boolean supportStream = false;
    private Boolean supportToolCall = false;
    private String status;
}
