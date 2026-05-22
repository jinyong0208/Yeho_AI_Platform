package com.yeho.ai.platform.dto.agent;

import java.math.BigDecimal;

public record AgentConfigRequest(
        Long tenantId,
        String agentCode,
        String agentName,
        String description,
        String systemPrompt,
        String defaultModel,
        BigDecimal temperature,
        Integer maxTokens,
        String status
) {
}
