package com.yeho.ai.platform.dto.workflow;

import java.time.LocalDateTime;

public record WorkflowRuntimeConfigResponse(
        Long tenantId,
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
        LocalDateTime publishedAt
) {
}
