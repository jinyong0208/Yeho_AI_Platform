package com.yeho.ai.platform.dto.agent;

import java.time.LocalDateTime;

public record PromptTemplateResponse(
        Long id,
        Long tenantId,
        String templateCode,
        String templateName,
        String description,
        String content,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
