package com.yeho.ai.platform.dto.workflow;

public record WorkflowRequest(
        Long tenantId,
        String workflowCode,
        String workflowName,
        String description,
        String systemCode,
        String dataDomain,
        String agentCode,
        String defaultModel,
        String schemaJson,
        String status
) {
}
