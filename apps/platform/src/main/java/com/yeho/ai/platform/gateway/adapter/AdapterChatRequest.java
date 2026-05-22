package com.yeho.ai.platform.gateway.adapter;

import com.yeho.ai.platform.dto.openai.ChatMessage;

import java.math.BigDecimal;
import java.util.List;

public record AdapterChatRequest(
    String baseUrl,
    String apiKey,
    String model,
    List<ChatMessage> messages,
    BigDecimal temperature,
    Integer maxTokens
) {
}
