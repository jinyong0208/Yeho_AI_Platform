package com.yeho.ai.platform.dto.agent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record AgentRunRequest(
    @NotBlank
    @Size(max = 4000)
    String input,
    Map<String, Object> context
) {
}
