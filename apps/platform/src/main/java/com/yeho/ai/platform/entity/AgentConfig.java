package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("agent_config")
public class AgentConfig {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private String systemCode;
    private String dataDomain;
    private String allowedDataDomains;
    private String agentCode;
    private String agentName;
    private String description;
    private String systemPrompt;
    private String defaultModel;
    private BigDecimal temperature;
    private Integer maxTokens;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
