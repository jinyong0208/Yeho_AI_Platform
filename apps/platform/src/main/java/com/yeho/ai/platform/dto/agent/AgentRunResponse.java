package com.yeho.ai.platform.dto.agent;

import java.util.List;
import java.util.Map;

public record AgentRunResponse(
    String requestId,
    String agentCode,
    String intent,
    String answer,
    List<AgentStepResponse> steps,
    Map<String, Object> metadata,
    Long latencyMs
) {
}
