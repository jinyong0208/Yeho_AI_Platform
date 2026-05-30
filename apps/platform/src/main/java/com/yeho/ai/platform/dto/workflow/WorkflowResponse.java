package com.yeho.ai.platform.dto.workflow;

import java.time.LocalDateTime;

public record WorkflowResponse(
        Long id,
        Long tenantId,
        String workflowCode,
        String workflowName,
        String description,
        String systemCode,
        String dataDomain,
        String agentCode,
        String defaultModel,
        String schemaJson,
        String status,
        Integer currentVersionNo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
