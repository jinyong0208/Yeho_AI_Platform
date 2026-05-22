package com.yeho.ai.platform.dto.gateway;

public record EmbeddingRequest(
        String model,
        Object input,
        String encodingFormat,
        String user
) {
}
