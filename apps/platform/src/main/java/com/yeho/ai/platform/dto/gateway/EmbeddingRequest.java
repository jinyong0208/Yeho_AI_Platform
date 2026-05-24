package com.yeho.ai.platform.dto.gateway;

import com.fasterxml.jackson.annotation.JsonProperty;

public record EmbeddingRequest(
        String model,
        Object input,
        Integer dimensions,
        @JsonProperty("encoding_format")
        String encodingFormat,
        String user
) {
}
