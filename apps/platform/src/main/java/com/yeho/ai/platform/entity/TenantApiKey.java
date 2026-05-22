package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("tenant_api_key")
public class TenantApiKey {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private String apiKeyHash;
    private String apiKeyPrefix;
    private String name;
    private String status;
    private LocalDateTime expiredAt;
    private LocalDateTime createdAt;
    private LocalDateTime lastUsedAt;
}
