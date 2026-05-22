package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("tenant_rate_limit")
public class TenantRateLimit {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private Integer rpmLimit;
    private Integer tpmLimit;
    private Long dailyCreditsLimit;
    private Integer maxConcurrent;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
