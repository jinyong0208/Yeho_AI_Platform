package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("workflow_definition")
public class WorkflowDefinition {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private String workflowCode;
    private String workflowName;
    private String description;
    private String systemCode;
    private String dataDomain;
    private String agentCode;
    private String defaultModel;
    private String schemaJson;
    private String status;
    private Integer currentVersionNo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
