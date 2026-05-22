package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("ai_model")
public class AiModel {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long providerId;
    private String modelCode;
    private String displayName;
    private BigDecimal inputPrice;
    private BigDecimal outputPrice;
    private BigDecimal inputCreditRate;
    private BigDecimal outputCreditRate;
    private BigDecimal billingMultiplier;
    private Boolean supportStream;
    private Boolean supportToolCall;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
