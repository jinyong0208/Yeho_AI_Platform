package com.yeho.ai.platform.dto.agent;

public record PromptTemplateRequest(
        Long tenantId,
        String templateCode,
        String templateName,
        String description,
        String content,
        String status
) {
}
