package com.yeho.ai.platform.dto.gateway;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WalletRechargeRequest {
    @NotNull
    @Min(1)
    private Long amountCredits;

    private String remark;
}
