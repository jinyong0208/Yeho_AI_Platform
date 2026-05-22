package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("tenant_wallet_log")
public class TenantWalletLog {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private String bizType;
    private String bizId;
    private String direction;
    private Long amountCredits;
    private Long balanceAfter;
    private String remark;
    private LocalDateTime createdAt;
}
