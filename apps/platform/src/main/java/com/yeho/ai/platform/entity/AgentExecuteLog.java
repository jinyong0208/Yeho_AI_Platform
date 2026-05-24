package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("agent_execute_log")
public class AgentExecuteLog {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String requestId;
    private Long tenantId;
    private Long agentConfigId;
    private String systemCode;
    private String dataDomain;
    private String agentCode;
    private String model;
    private Long latencyMs;
    private Long inputTokens;
    private Long outputTokens;
    private Long totalTokens;
    private Long chargeCredits;
    private Boolean success;
    private String errorCode;
    private String errorMessage;
    private String traceId;
    private LocalDateTime createdAt;
}
