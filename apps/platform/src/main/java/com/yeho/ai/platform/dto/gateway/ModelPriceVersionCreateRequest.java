package com.yeho.ai.platform.dto.gateway;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class ModelPriceVersionCreateRequest {
    private BigDecimal inputPrice;
    private BigDecimal outputPrice;
    private BigDecimal inputCreditRate;
    private BigDecimal outputCreditRate;
    private BigDecimal billingMultiplier;
    private String remark;
}
