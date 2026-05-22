package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_model_price_version")
public class AiModelPriceVersion {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long modelId;
    private Integer versionNo;
    private BigDecimal inputPrice;
    private BigDecimal outputPrice;
    private BigDecimal inputCreditRate;
    private BigDecimal outputCreditRate;
    private BigDecimal billingMultiplier;
    private LocalDateTime effectiveAt;
    private String remark;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
