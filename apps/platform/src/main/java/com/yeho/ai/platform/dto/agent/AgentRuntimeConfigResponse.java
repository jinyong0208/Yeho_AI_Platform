package com.yeho.ai.platform.dto.agent;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AgentRuntimeConfigResponse(
        Long tenantId,
        String systemCode,
        String dataDomain,
        String allowedDataDomains,
        String agentCode,
        String promptTemplateCode,
        String agentName,
        String description,
        String systemPrompt,
        String defaultModel,
        BigDecimal temperature,
        Integer maxTokens,
        String status,
        RuntimePromptTemplate promptTemplate
) {
    public record RuntimePromptTemplate(
            Long id,
            String templateCode,
            String templateName,
            String description,
            Integer versionNo,
            String content,
            String status,
            LocalDateTime publishedAt
    ) {
    }
}
