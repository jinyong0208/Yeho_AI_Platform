package com.yeho.ai.platform.dto.openai;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ChatCompletionResponse(
    String id,
    String object,
    Long created,
    String model,
    List<Choice> choices,
    Usage usage
) {
    public record Choice(
        Integer index,
        ChatMessage message,
        @JsonProperty("finish_reason")
        String finishReason
    ) {
    }

    public record Usage(
        @JsonProperty("prompt_tokens")
        Integer promptTokens,
        @JsonProperty("completion_tokens")
        Integer completionTokens,
        @JsonProperty("total_tokens")
        Integer totalTokens
    ) {
    }
}
