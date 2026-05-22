package com.yeho.ai.platform.dto.openai;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatMessage {
    @NotBlank
    private String role;

    @NotBlank
    private String content;
}
