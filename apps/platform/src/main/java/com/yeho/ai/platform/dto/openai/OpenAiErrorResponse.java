package com.yeho.ai.platform.dto.openai;

public record OpenAiErrorResponse(OpenAiError error) {
    public record OpenAiError(
        String message,
        String type,
        String code
    ) {
    }
}
