package com.yeho.ai.platform.dto.openai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChatCompletionChunkResponse(
    String id,
    String object,
    Long created,
    String model,
    List<Choice> choices
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Choice(
        Integer index,
        Delta delta,
        @JsonProperty("finish_reason")
        String finishReason
    ) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Delta(
        String role,
        String content
    ) {
    }
}
