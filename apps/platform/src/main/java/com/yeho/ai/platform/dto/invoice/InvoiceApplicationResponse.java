package com.yeho.ai.platform.dto.invoice;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceApplicationResponse(
    Long id,
    Long tenantId,
    String invoiceTitle,
    String taxNo,
    BigDecimal amountCny,
    String invoiceType,
    String status,
    String email,
    LocalDateTime appliedAt,
    LocalDateTime issuedAt,
    String remark,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
