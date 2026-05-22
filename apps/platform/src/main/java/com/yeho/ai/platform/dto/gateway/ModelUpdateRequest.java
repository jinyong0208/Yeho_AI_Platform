package com.yeho.ai.platform.dto.gateway;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ModelUpdateRequest {
    private Long providerId;
    private String displayName;
    private BigDecimal inputPrice;
    private BigDecimal outputPrice;
    private BigDecimal inputCreditRate;
    private BigDecimal outputCreditRate;
    private BigDecimal billingMultiplier;
    private Boolean supportStream;
    private Boolean supportToolCall;
    private String status;
}
