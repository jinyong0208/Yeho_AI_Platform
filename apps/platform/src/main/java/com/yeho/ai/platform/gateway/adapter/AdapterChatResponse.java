package com.yeho.ai.platform.gateway.adapter;

public record AdapterChatResponse(
    String content,
    Integer inputTokens,
    Integer outputTokens,
    Integer totalTokens,
    String finishReason
) {
}
