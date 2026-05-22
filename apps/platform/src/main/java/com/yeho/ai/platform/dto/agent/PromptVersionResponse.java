package com.yeho.ai.platform.dto.agent;

import java.time.LocalDateTime;

public record PromptVersionResponse(
        Long id,
        Long tenantId,
        Long templateId,
        Integer versionNo,
        String content,
        String status,
        LocalDateTime publishedAt,
        LocalDateTime createdAt
) {
}
