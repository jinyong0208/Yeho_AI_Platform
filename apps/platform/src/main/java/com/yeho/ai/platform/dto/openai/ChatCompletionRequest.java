package com.yeho.ai.platform.dto.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ChatCompletionRequest {
    @NotBlank
    private String model;

    @NotEmpty
    @Valid
    private List<ChatMessage> messages;

    private BigDecimal temperature = BigDecimal.valueOf(0.7);

    @JsonProperty("max_tokens")
    private Integer maxTokens;

    private Boolean stream = false;
}
