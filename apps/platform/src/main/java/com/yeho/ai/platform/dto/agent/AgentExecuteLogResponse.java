package com.yeho.ai.platform.dto.agent;

import java.time.LocalDateTime;

public record AgentExecuteLogResponse(
        Long id,
        String requestId,
        Long tenantId,
        Long agentConfigId,
        String systemCode,
        String dataDomain,
        String agentCode,
        String model,
        Long latencyMs,
        Long inputTokens,
        Long outputTokens,
        Long totalTokens,
        Long chargeCredits,
        Boolean success,
        String errorCode,
        String errorMessage,
        String traceId,
        LocalDateTime createdAt
) {
}
