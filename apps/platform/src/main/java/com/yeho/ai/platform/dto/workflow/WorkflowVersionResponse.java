package com.yeho.ai.platform.dto.workflow;

import java.time.LocalDateTime;

public record WorkflowVersionResponse(
        Long id,
        Long tenantId,
        Long workflowId,
        String workflowCode,
        String workflowName,
        String description,
        String systemCode,
        String dataDomain,
        String agentCode,
        String defaultModel,
        Integer versionNo,
        String schemaJson,
        String status,
        LocalDateTime publishedAt,
        LocalDateTime createdAt
) {
}
