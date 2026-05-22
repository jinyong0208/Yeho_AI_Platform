package com.yeho.ai.platform.dto.agent;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AgentConfigResponse(
        Long id,
        Long tenantId,
        String agentCode,
        String agentName,
        String description,
        String systemPrompt,
        String defaultModel,
        BigDecimal temperature,
        Integer maxTokens,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
