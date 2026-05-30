package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("workflow_version")
public class WorkflowVersion {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private Long workflowId;
    private String workflowCode;
    private String workflowName;
    private String description;
    private String systemCode;
    private String dataDomain;
    private String agentCode;
    private String defaultModel;
    private Integer versionNo;
    private String schemaJson;
    private String status;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
}
