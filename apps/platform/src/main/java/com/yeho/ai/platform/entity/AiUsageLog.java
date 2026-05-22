package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("ai_usage_log")
public class AiUsageLog {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private Long userId;
    private Long apiKeyId;
    private String providerCode;
    private String modelCode;
    private String requestId;
    private String apiKeyScopes;
    private Integer inputTokens;
    private Integer outputTokens;
    private Integer totalTokens;
    private BigDecimal realCost;
    private Long chargeCredits;
    private BigDecimal profit;
    private Long latencyMs;
    private Boolean success;
    private String errorCode;
    private String errorMessage;
    private String promptSummary;
    private LocalDateTime createdAt;
}
