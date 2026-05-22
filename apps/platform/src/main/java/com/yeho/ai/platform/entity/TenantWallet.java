package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("tenant_wallet")
public class TenantWallet {
    @TableId
    private Long tenantId;
    private Long balanceCredits;
    private Long frozenCredits;
    private Long totalRechargeCredits;
    private Long totalUsedCredits;
    private LocalDateTime updatedAt;
}
