package com.yeho.ai.platform.gateway.adapter;

public record AdapterStreamChunk(
    String contentDelta,
    String finishReason,
    Integer inputTokens,
    Integer outputTokens,
    Integer totalTokens
) {
}
