package com.yeho.ai.platform.dto.invoice;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class InvoiceApplicationCreateRequest {
    @NotNull
    private Long tenantId;

    @NotBlank
    private String invoiceTitle;

    private String taxNo;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amountCny;

    @NotBlank
    private String invoiceType;

    @Email
    private String email;

    private String remark;
}
