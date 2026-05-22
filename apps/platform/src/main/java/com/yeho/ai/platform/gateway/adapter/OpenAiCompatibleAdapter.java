package com.yeho.ai.platform.gateway.adapter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.gateway.GatewayException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@RequiredArgsConstructor
public abstract class OpenAiCompatibleAdapter implements AiProviderAdapter {
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Override
    public AdapterChatResponse chat(AdapterChatRequest request) {
        if (!StringUtils.hasText(request.apiKey())) {
            throw new GatewayException(HttpStatus.BAD_REQUEST, "provider_api_key_missing", "Provider API key is missing");
        }
        try {
            Map<String, Object> payload = Map.of(
                "model", request.model(),
                "messages", request.messages(),
                "temperature", request.temperature(),
                "max_tokens", request.maxTokens() == null ? 512 : request.maxTokens(),
                "stream", false
            );
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint(request.baseUrl())))
                .timeout(Duration.ofSeconds(120))
                .header("Authorization", "Bearer " + request.apiKey())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();
            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new GatewayException(
                    HttpStatus.BAD_GATEWAY,
                    "provider_error",
                    "Provider call failed with status " + response.statusCode()
                );
            }
            return parseResponse(response.body());
        } catch (GatewayException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_interrupted", "Provider call was interrupted");
        } catch (Exception ex) {
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_error", "Provider call failed");
        }
    }

    @Override
    public void streamChat(AdapterChatRequest request, AdapterStreamConsumer consumer) {
        if (!StringUtils.hasText(request.apiKey())) {
            throw new GatewayException(HttpStatus.BAD_REQUEST, "provider_api_key_missing", "Provider API key is missing");
        }
        try {
            Map<String, Object> payload = Map.of(
                "model", request.model(),
                "messages", request.messages(),
                "temperature", request.temperature(),
                "max_tokens", request.maxTokens() == null ? 512 : request.maxTokens(),
                "stream", true
            );
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint(request.baseUrl())))
                .timeout(Duration.ofSeconds(120))
                .header("Authorization", "Bearer " + request.apiKey())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();
            HttpResponse<Stream<String>> response = httpClient.send(
                httpRequest,
                HttpResponse.BodyHandlers.ofLines()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new GatewayException(
                    HttpStatus.BAD_GATEWAY,
                    "provider_error",
                    "Provider stream failed with status " + response.statusCode()
                );
            }
            try (Stream<String> lines = response.body()) {
                Iterator<String> iterator = lines.iterator();
                while (iterator.hasNext()) {
                    String line = iterator.next().trim();
                    if (!line.startsWith("data:")) {
                        continue;
                    }
                    String data = line.substring(5).trim();
                    if ("[DONE]".equals(data)) {
                        break;
                    }
                    AdapterStreamChunk chunk = parseStreamChunk(data);
                    if (chunk != null) {
                        consumer.accept(chunk);
                    }
                }
            }
        } catch (GatewayException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_interrupted", "Provider stream was interrupted");
        } catch (Exception ex) {
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_error", "Provider stream failed");
        }
    }

    private String endpoint(String baseUrl) {
        String normalized = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        if (normalized.endsWith("/v1")) {
            return normalized + "/chat/completions";
        }
        return normalized + "/v1/chat/completions";
    }

    @SuppressWarnings("unchecked")
    private AdapterChatResponse parseResponse(String responseBody) throws Exception {
        Map<String, Object> body = objectMapper.readValue(responseBody, MAP_TYPE);
        List<Object> choices = (List<Object>) body.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_empty_response", "Provider returned no choices");
        }
        Map<String, Object> firstChoice = (Map<String, Object>) choices.get(0);
        Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
        String content = message == null ? "" : String.valueOf(message.getOrDefault("content", ""));
        String finishReason = String.valueOf(firstChoice.getOrDefault("finish_reason", "stop"));
        Map<String, Object> usage = (Map<String, Object>) body.get("usage");
        Integer inputTokens = numberValue(usage, "prompt_tokens");
        Integer outputTokens = numberValue(usage, "completion_tokens");
        Integer totalTokens = numberValue(usage, "total_tokens");
        return new AdapterChatResponse(content, inputTokens, outputTokens, totalTokens, finishReason);
    }

    @SuppressWarnings("unchecked")
    private AdapterStreamChunk parseStreamChunk(String data) throws Exception {
        Map<String, Object> body = objectMapper.readValue(data, MAP_TYPE);
        Map<String, Object> usage = (Map<String, Object>) body.get("usage");
        Integer inputTokens = numberValue(usage, "prompt_tokens");
        Integer outputTokens = numberValue(usage, "completion_tokens");
        Integer totalTokens = numberValue(usage, "total_tokens");

        List<Object> choices = (List<Object>) body.get("choices");
        if (choices == null || choices.isEmpty()) {
            if (usage == null) {
                return null;
            }
            return new AdapterStreamChunk(null, null, inputTokens, outputTokens, totalTokens);
        }

        Map<String, Object> firstChoice = (Map<String, Object>) choices.get(0);
        Map<String, Object> delta = (Map<String, Object>) firstChoice.get("delta");
        Object content = delta == null ? null : delta.get("content");
        Object finishReason = firstChoice.get("finish_reason");
        return new AdapterStreamChunk(
            content == null ? null : String.valueOf(content),
            finishReason == null ? null : String.valueOf(finishReason),
            inputTokens,
            outputTokens,
            totalTokens
        );
    }

    private Integer numberValue(Map<String, Object> usage, String key) {
        if (usage == null || usage.get(key) == null) {
            return null;
        }
        Object value = usage.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
