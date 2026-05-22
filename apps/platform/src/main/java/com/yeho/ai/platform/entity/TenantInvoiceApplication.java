package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("tenant_invoice_application")
public class TenantInvoiceApplication {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private String invoiceTitle;
    private String taxNo;
    private BigDecimal amountCny;
    private String invoiceType;
    private String status;
    private String email;
    private LocalDateTime appliedAt;
    private LocalDateTime issuedAt;
    private String remark;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
