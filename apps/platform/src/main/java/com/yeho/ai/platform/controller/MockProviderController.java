package com.yeho.ai.platform.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatCompletionChunkResponse;
import com.yeho.ai.platform.dto.openai.ChatCompletionResponse;
import com.yeho.ai.platform.dto.openai.ChatMessage;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/mock-provider/v1")
@RequiredArgsConstructor
public class MockProviderController {
    private static final Pattern DELAY_MARKER = Pattern.compile("\\[mock-delay-ms=(\\d{1,5})]");

    private final ObjectMapper objectMapper;

    @PostMapping("/chat/completions")
    public StreamingResponseBody chatCompletions(
        @RequestBody ChatCompletionRequest request,
        HttpServletResponse response
    ) {
        sleepIfRequested(request);
        if (Boolean.TRUE.equals(request.getStream())) {
            response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
            response.setHeader("Cache-Control", "no-cache");
            return outputStream -> writeStream(request, outputStream);
        }
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ChatCompletionResponse chatResponse = buildResponse(request);
        return outputStream -> objectMapper.writeValue(outputStream, chatResponse);
    }

    @PostMapping("/embeddings")
    public Map<String, Object> embeddings(@RequestBody Map<String, Object> request) {
        Object input = request.get("input");
        List<String> inputs = normalizeEmbeddingInputs(input);
        List<Map<String, Object>> data = new ArrayList<>();
        for (int i = 0; i < inputs.size(); i++) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("object", "embedding");
            item.put("embedding", mockEmbedding(inputs.get(i)));
            item.put("index", i);
            data.add(item);
        }
        int promptTokens = inputs.stream().mapToInt(value -> Math.max(1, value.length() / 4)).sum();
        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("prompt_tokens", promptTokens);
        usage.put("total_tokens", promptTokens);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("object", "list");
        response.put("data", data);
        response.put("model", String.valueOf(request.getOrDefault("model", "mock-embedding")));
        response.put("usage", usage);
        return response;
    }

    private ChatCompletionResponse buildResponse(ChatCompletionRequest request) {
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

    private void writeStream(ChatCompletionRequest request, OutputStream outputStream) throws IOException {
        String assistantContent = buildAssistantContent(request);
        String completionId = "chatcmpl-" + UUID.randomUUID().toString().replace("-", "");
        long created = Instant.now().getEpochSecond();
        writeChunk(outputStream, completionId, created, request.getModel(), "assistant", null, null);
        for (String part : streamParts(assistantContent)) {
            writeChunk(outputStream, completionId, created, request.getModel(), null, part, null);
        }
        writeChunk(outputStream, completionId, created, request.getModel(), null, null, "stop");
        outputStream.write("data: [DONE]\n\n".getBytes(StandardCharsets.UTF_8));
        outputStream.flush();
    }

    private void writeChunk(
        OutputStream outputStream,
        String completionId,
        long created,
        String model,
        String role,
        String content,
        String finishReason
    ) throws IOException {
        ChatCompletionChunkResponse chunk = new ChatCompletionChunkResponse(
            completionId,
            "chat.completion.chunk",
            created,
            model,
            List.of(new ChatCompletionChunkResponse.Choice(
                0,
                new ChatCompletionChunkResponse.Delta(role, content),
                finishReason
            ))
        );
        outputStream.write(("data: " + objectMapper.writeValueAsString(chunk) + "\n\n").getBytes(StandardCharsets.UTF_8));
        outputStream.flush();
    }

    private List<String> streamParts(String content) {
        List<String> parts = new ArrayList<>();
        if (content == null || content.isEmpty()) {
            parts.add("");
            return parts;
        }
        int chunkSize = 12;
        for (int i = 0; i < content.length(); i += chunkSize) {
            parts.add(content.substring(i, Math.min(content.length(), i + chunkSize)));
        }
        return parts;
    }

    private List<String> normalizeEmbeddingInputs(Object input) {
        if (input instanceof List<?> values) {
            return values.stream()
                .map(value -> value == null ? "" : String.valueOf(value))
                .toList();
        }
        return List.of(input == null ? "" : String.valueOf(input));
    }

    private List<Double> mockEmbedding(String input) {
        int hash = input == null ? 0 : input.hashCode();
        return List.of(
            ((hash & 0xff) / 255.0),
            (((hash >> 8) & 0xff) / 255.0),
            (((hash >> 16) & 0xff) / 255.0)
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

    private void sleepIfRequested(ChatCompletionRequest request) {
        String content = request.getMessages() == null ? "" : request.getMessages().stream()
            .map(ChatMessage::getContent)
            .filter(value -> value != null && !value.isBlank())
            .reduce((first, second) -> second)
            .orElse("");
        Matcher matcher = DELAY_MARKER.matcher(content);
        if (!matcher.find()) {
            return;
        }
        long delayMs = Math.min(Long.parseLong(matcher.group(1)), 10_000L);
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
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
