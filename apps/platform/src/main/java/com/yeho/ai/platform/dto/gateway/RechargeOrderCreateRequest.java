package com.yeho.ai.platform.dto.gateway;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RechargeOrderCreateRequest {
    @NotNull
    private Long tenantId;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amountCny;

    @NotNull
    @Min(1)
    private Long credits;

    private String payChannel;
    private String payerName;
    private String payerAccount;
    private String paymentProofNo;
    private String remark;
}
