package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatCompletionResponse;
import com.yeho.ai.platform.dto.openai.ChatMessage;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/mock-provider/v1")
public class MockProviderController {

    @PostMapping("/chat/completions")
    public ChatCompletionResponse chatCompletions(@RequestBody ChatCompletionRequest request) {
        String assistantContent = buildAssistantContent(request);
        ChatMessage assistantMessage = new ChatMessage();
        assistantMessage.setRole("assistant");
        assistantMessage.setContent(assistantContent);

        int promptTokens = estimatePromptTokens(request);
        int completionTokens = estimateCompletionTokens(assistantContent);

        return new ChatCompletionResponse(
            "chatcmpl-" + UUID.randomUUID().toString().replace("-", ""),
            "chat.completion",
            Instant.now().getEpochSecond(),
            request.getModel(),
            List.of(new ChatCompletionResponse.Choice(0, assistantMessage, "stop")),
            new ChatCompletionResponse.Usage(promptTokens, completionTokens, promptTokens + completionTokens)
        );
    }

    private String buildAssistantContent(ChatCompletionRequest request) {
        if (request.getMessages() == null || request.getMessages().isEmpty()) {
            return "Mock response";
        }
        String lastUserMessage = request.getMessages().stream()
            .filter(message -> "user".equalsIgnoreCase(message.getRole()))
            .reduce((first, second) -> second)
            .map(ChatMessage::getContent)
            .orElse(request.getMessages().get(request.getMessages().size() - 1).getContent());
        return "Mock response for " + request.getModel() + ": " + truncate(lastUserMessage, 120);
    }

    private int estimatePromptTokens(ChatCompletionRequest request) {
        if (request.getMessages() == null || request.getMessages().isEmpty()) {
            return 1;
        }
        return Math.max(1, request.getMessages().stream()
            .mapToInt(message -> message.getContent() == null ? 0 : message.getContent().length())
            .sum());
    }

    private int estimateCompletionTokens(String content) {
        return Math.max(1, content == null ? 0 : content.length());
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value == null ? "" : value;
        }
        return value.substring(0, maxLength);
    }
}
