package com.yeho.ai.platform.dto.agent;

import java.util.Map;

public record AgentClientRunRequest(
    String input,
    String tenantId,
    String userId,
    String requestId,
    Map<String, Object> context
) {
}
