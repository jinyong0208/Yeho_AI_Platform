package com.yeho.ai.platform.dto.gateway;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record EmbeddingResponse(
        String object,
        List<EmbeddingData> data,
        String model,
        Usage usage
) {
    public record EmbeddingData(
            String object,
            List<Double> embedding,
            Integer index
    ) {
    }

    public record Usage(
            @JsonProperty("prompt_tokens")
            Integer promptTokens,
            @JsonProperty("total_tokens")
            Integer totalTokens
    ) {
    }
}
