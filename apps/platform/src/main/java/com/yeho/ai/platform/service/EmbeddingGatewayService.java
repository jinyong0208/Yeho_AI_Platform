package com.yeho.ai.platform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.yeho.ai.platform.dto.gateway.EmbeddingRequest;
import com.yeho.ai.platform.dto.gateway.EmbeddingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmbeddingGatewayService {

    private static final String EMBEDDING_SCOPE = "embedding:create";

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public EmbeddingResponse embeddings(String authorization, EmbeddingRequest request) {
        String apiKey = extractBearer(authorization);
        ApiKeyContext apiKeyContext = authenticate(apiKey);
        requireScope(apiKeyContext.scopes(), EMBEDDING_SCOPE);
        ModelContext model = resolveModel(request.model());
        List<String> inputs = normalizeInput(request.input());
        EmbeddingProviderAdapter adapter = adapter(model.providerCode());
        EmbeddingResponse response = adapter.embed(model, request.model(), inputs);
        recordUsage(apiKeyContext, model, response);
        return response;
    }

    private ApiKeyContext authenticate(String apiKey) {
        String hash = sha256(apiKey);
        return jdbcTemplate.query("""
                        select id, tenant_id, scopes
                        from tenant_api_key
                        where api_key_hash = ? and status = 'ACTIVE'
                        """,
                rs -> {
                    if (!rs.next()) {
                        throw new IllegalArgumentException("Invalid API key");
                    }
                    return new ApiKeyContext(rs.getLong("id"), rs.getLong("tenant_id"), rs.getString("scopes"));
                },
                hash
        );
    }

    private ModelContext resolveModel(String modelCode) {
        return jdbcTemplate.query("""
                        select m.id as model_id,
                               m.model_code,
                               p.provider_code,
                               p.base_url,
                               p.api_key_encrypted,
                               p.timeout_ms
                        from ai_model m
                        join ai_provider p on p.id = m.provider_id
                        where m.model_code = ?
                          and m.status = 'ACTIVE'
                          and p.status = 'ACTIVE'
                        """,
                rs -> {
                    if (!rs.next()) {
                        throw new IllegalArgumentException("Embedding model not found");
                    }
                    return new ModelContext(
                            rs.getLong("model_id"),
                            rs.getString("model_code"),
                            rs.getString("provider_code"),
                            rs.getString("base_url"),
                            rs.getString("api_key_encrypted"),
                            rs.getInt("timeout_ms")
                    );
                },
                modelCode
        );
    }

    private EmbeddingProviderAdapter adapter(String providerCode) {
        if ("QWEN".equalsIgnoreCase(providerCode)) {
            return new QwenEmbeddingAdapter(RestClient.create(), objectMapper);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Embedding provider is not supported: " + providerCode);
    }

    private void recordUsage(ApiKeyContext apiKeyContext, ModelContext model, EmbeddingResponse response) {
        int totalTokens = response.usage() == null ? 0 : response.usage().totalTokens();
        jdbcTemplate.update("""
                        insert into ai_usage_log (
                            id, tenant_id, api_key_id, provider_code, model_code, request_id,
                            input_tokens, output_tokens, total_tokens, real_cost, charge_credits,
                            latency_ms, success, created_at
                        ) values (
                            ?,
                            ?, ?, ?, ?, ?,
                            ?, 0, ?, 0, 0,
                            0, true, ?
                        )
                        """,
                IdWorker.getId(),
                apiKeyContext.tenantId(),
                apiKeyContext.id(),
                model.providerCode(),
                model.modelCode(),
                UUID.randomUUID().toString(),
                totalTokens,
                totalTokens,
                LocalDateTime.now()
        );
    }

    private String extractBearer(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }
        return authorization.substring("Bearer ".length()).trim();
    }

    private void requireScope(String scopes, String requiredScope) {
        if (scopes == null) {
            throw new IllegalArgumentException("API key scope denied");
        }
        for (String scope : scopes.split(",")) {
            String normalized = scope.trim();
            if ("admin:*".equals(normalized) || requiredScope.equals(normalized)) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "API key scope denied");
    }

    private List<String> normalizeInput(Object input) {
        if (input instanceof String text) {
            return List.of(text);
        }
        if (input instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Embedding input must be string or string array");
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash API key", ex);
        }
    }

    public interface EmbeddingProviderAdapter {
        EmbeddingResponse embed(ModelContext model, String requestModel, List<String> input);
    }

    public record ApiKeyContext(Long id, Long tenantId, String scopes) {
    }

    public record ModelContext(Long modelId, String modelCode, String providerCode, String baseUrl, String apiKey, Integer timeoutMs) {
    }

    public static class QwenEmbeddingAdapter implements EmbeddingProviderAdapter {
        private final RestClient restClient;
        private final ObjectMapper objectMapper;

        QwenEmbeddingAdapter(RestClient restClient, ObjectMapper objectMapper) {
            this.restClient = restClient;
            this.objectMapper = objectMapper;
        }

        @Override
        public EmbeddingResponse embed(ModelContext model, String requestModel, List<String> input) {
            String url = model.baseUrl().replaceAll("/+$", "") + "/embeddings";
            Map<String, Object> body = Map.of("model", requestModel, "input", input);
            String raw = restClient.post()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + model.apiKey())
                    .body(body)
                    .retrieve()
                    .body(String.class);
            return parse(raw, requestModel);
        }

        private EmbeddingResponse parse(String raw, String model) {
            try {
                JsonNode root = objectMapper.readTree(raw);
                List<EmbeddingResponse.EmbeddingData> data = new ArrayList<>();
                for (JsonNode item : root.path("data")) {
                    List<Double> embedding = new ArrayList<>();
                    for (JsonNode value : item.path("embedding")) {
                        embedding.add(value.asDouble());
                    }
                    data.add(new EmbeddingResponse.EmbeddingData(
                            item.path("object").asText("embedding"),
                            embedding,
                            item.path("index").asInt(data.size())
                    ));
                }
                JsonNode usage = root.path("usage");
                return new EmbeddingResponse(
                        root.path("object").asText("list"),
                        data,
                        root.path("model").asText(model),
                        new EmbeddingResponse.Usage(
                                usage.path("prompt_tokens").asInt(0),
                                usage.path("total_tokens").asInt(0)
                        )
                );
            } catch (Exception ex) {
                throw new IllegalStateException("Unable to parse embedding response", ex);
            }
        }
    }
}
