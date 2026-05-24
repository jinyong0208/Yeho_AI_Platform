package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.common.RequestContext;
import com.yeho.ai.platform.dto.gateway.EmbeddingRequest;
import com.yeho.ai.platform.dto.gateway.EmbeddingResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmbeddingGatewayService {

    private static final String EMBEDDING_SCOPE = "embedding:create";
    private static final int MAX_ERROR_LENGTH = 500;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;

    public EmbeddingGatewayService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            ApplicationContext applicationContext
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.applicationContext = applicationContext;
    }

    public EmbeddingResponse embeddings(String authorization, EmbeddingRequest request) {
        long startedAt = System.currentTimeMillis();
        String requestId = StringUtils.hasText(RequestContext.getRequestId())
                ? RequestContext.getRequestId()
                : UUID.randomUUID().toString();
        ApiKeyIdentity apiKey = authenticate(authorization);
        requireScope(apiKey);
        List<String> inputs = normalizeInput(request.input());
        validateDimensions(request.dimensions());
        ModelRoute model = resolveModel(request.model());

        try {
            EmbeddingResponse response = callProvider(model, request, inputs);
            recordUsage(apiKey, model, requestId, startedAt, true, response.usage().totalTokens(), null, null);
            return response;
        } catch (ResponseStatusException ex) {
            recordUsage(apiKey, model, requestId, startedAt, false, 0L, String.valueOf(ex.getStatusCode().value()), ex.getReason());
            throw ex;
        } catch (Exception ex) {
            recordUsage(apiKey, model, requestId, startedAt, false, 0L, "PROVIDER_ERROR", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Embedding provider request failed");
        }
    }

    private ApiKeyIdentity authenticate(String authorization) {
        String apiKey = extractBearer(authorization);
        String apiKeyHash = sha256(apiKey);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select id, tenant_id, scopes
                from tenant_api_key
                where api_key_hash = ? and status = 'ACTIVE'
                  and (expired_at is null or expired_at > now())
                limit 1
                """, apiKeyHash);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid API key");
        }
        Map<String, Object> row = rows.get(0);
        return new ApiKeyIdentity(
                asLong(row.get("id")),
                asLong(row.get("tenant_id")),
                String.valueOf(row.getOrDefault("scopes", ""))
        );
    }

    private String extractBearer(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Authorization header");
        }
        String prefix = "Bearer ";
        if (!authorization.regionMatches(true, 0, prefix, 0, prefix.length())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization must use Bearer token");
        }
        String value = authorization.substring(prefix.length()).trim();
        if (value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing API key");
        }
        return value;
    }

    private void requireScope(ApiKeyIdentity apiKey) {
        List<String> scopes = splitScopes(apiKey.scopes());
        if (!scopes.contains(EMBEDDING_SCOPE) && !scopes.contains("admin:*")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "API key scope denied");
        }
    }

    private List<String> splitScopes(String scopes) {
        if (scopes == null || scopes.isBlank()) {
            return List.of();
        }
        return List.of(scopes.split(",")).stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }

    private List<String> normalizeInput(Object input) {
        if (input == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "input is required");
        }
        if (input instanceof String value) {
            if (value.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "input must not be blank");
            }
            return List.of(value);
        }
        if (input instanceof List<?> values) {
            if (values.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "input must not be empty");
            }
            List<String> normalized = new ArrayList<>();
            for (Object value : values) {
                if (!(value instanceof String text) || text.isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "input array must contain non-empty strings");
                }
                normalized.add(text);
            }
            return normalized;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "input must be a string or string array");
    }

    private void validateDimensions(Integer dimensions) {
        if (dimensions != null && dimensions < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dimensions must be greater than 0");
        }
    }

    private ModelRoute resolveModel(String modelCode) {
        if (modelCode == null || modelCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "model is required");
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select m.id as model_id,
                       m.model_code,
                       m.current_price_version_id,
                       p.provider_code,
                       p.base_url,
                       p.api_key_encrypted,
                       coalesce(p.timeout_ms, 30000) as timeout_ms
                from ai_model m
                join ai_provider p on p.id = m.provider_id
                where m.model_code = ?
                  and m.status = 'ACTIVE'
                  and p.status = 'ACTIVE'
                limit 1
                """, modelCode);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Model not found");
        }
        Map<String, Object> row = rows.get(0);
        return new ModelRoute(
                asLong(row.get("model_id")),
                String.valueOf(row.get("model_code")),
                row.get("current_price_version_id") == null ? null : asLong(row.get("current_price_version_id")),
                String.valueOf(row.get("provider_code")),
                String.valueOf(row.get("base_url")),
                String.valueOf(row.get("api_key_encrypted")),
                asInt(row.get("timeout_ms"), 30_000)
        );
    }

    private EmbeddingResponse callProvider(ModelRoute model, EmbeddingRequest request, List<String> inputs) throws Exception {
        String providerCode = model.providerCode().toUpperCase(Locale.ROOT);
        if (!"QWEN".equals(providerCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Embedding is currently supported for Qwen provider only");
        }

        String providerKey = decryptSecret(model.encryptedApiKey());
        String endpoint = trimTrailingSlash(model.baseUrl()) + "/embeddings";
        Map<String, Object> providerRequest = new LinkedHashMap<>();
        providerRequest.put("model", request.model());
        providerRequest.put("input", inputs.size() == 1 ? inputs.get(0) : inputs);
        if (request.dimensions() != null) {
            providerRequest.put("dimensions", request.dimensions());
        }
        if (StringUtils.hasText(request.encodingFormat())) {
            providerRequest.put("encoding_format", request.encodingFormat());
        }

        String body = RestClient.builder()
                .baseUrl(endpoint)
                .build()
                .post()
                .header("Authorization", "Bearer " + providerKey)
                .body(providerRequest)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(body);
        List<EmbeddingResponse.EmbeddingData> data = new ArrayList<>();
        JsonNode dataNode = root.path("data");
        for (int i = 0; i < dataNode.size(); i++) {
            JsonNode item = dataNode.get(i);
            List<Double> embedding = new ArrayList<>();
            for (JsonNode value : item.path("embedding")) {
                embedding.add(value.asDouble());
            }
            if (request.dimensions() != null && embedding.size() != request.dimensions()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Embedding dimension mismatch: expected " + request.dimensions() + " but provider returned " + embedding.size()
                );
            }
            data.add(new EmbeddingResponse.EmbeddingData(
                    item.path("object").asText("embedding"),
                    embedding,
                    item.path("index").asInt(i)
            ));
        }

        JsonNode usageNode = root.path("usage");
        long promptTokens = usageNode.path("prompt_tokens").asLong(estimateTokens(inputs));
        long totalTokens = usageNode.path("total_tokens").asLong(promptTokens);
        return new EmbeddingResponse(
                root.path("object").asText("list"),
                data,
                root.path("model").asText(request.model()),
                new EmbeddingResponse.Usage(Math.toIntExact(promptTokens), Math.toIntExact(totalTokens))
        );
    }

    private long estimateTokens(List<String> inputs) {
        return inputs.stream()
                .mapToLong(value -> Math.max(1, value.length() / 4))
                .sum();
    }

    private void recordUsage(
            ApiKeyIdentity apiKey,
            ModelRoute model,
            String requestId,
            long startedAt,
            boolean success,
            long totalTokens,
            String errorCode,
            String errorMessage
    ) {
        long latencyMs = Math.max(0, System.currentTimeMillis() - startedAt);
        jdbcTemplate.update("""
                insert into ai_usage_log (
                    id, tenant_id, api_key_id, provider_code, model_code, request_id, price_version_id,
                    input_tokens, output_tokens, total_tokens, real_cost, charge_credits, profit,
                    latency_ms, success, error_code, error_message, api_key_scopes, created_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 0, ?, ?, ?, ?, ?, now())
                """,
                IdWorker.getId(),
                apiKey.tenantId(),
                apiKey.apiKeyId(),
                model.providerCode(),
                model.modelCode(),
                requestId,
                model.priceVersionId(),
                totalTokens,
                totalTokens,
                latencyMs,
                success,
                errorCode,
                sanitizeError(errorMessage),
                apiKey.scopes()
        );
    }

    private String sanitizeError(String errorMessage) {
        if (errorMessage == null || errorMessage.isBlank()) {
            return null;
        }
        String sanitized = errorMessage.replaceAll("(?i)Bearer\\s+[A-Za-z0-9._\\-]+", "Bearer ***");
        return sanitized.length() > MAX_ERROR_LENGTH ? sanitized.substring(0, MAX_ERROR_LENGTH) : sanitized;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash API key", ex);
        }
    }

    private String decryptSecret(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Provider API key is not configured");
        }
        for (Object bean : applicationContext.getBeansWithAnnotation(Service.class).values()) {
            try {
                Method method = bean.getClass().getMethod("decrypt", String.class);
                Object decrypted = method.invoke(bean, encryptedValue);
                if (decrypted instanceof String value && !value.isBlank()) {
                    return value;
                }
            } catch (NoSuchMethodException ignored) {
                // Keep scanning service beans; provider key encryption service names differ by module.
            } catch (Exception ex) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Provider API key decrypt failed");
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Provider API key decrypt service is unavailable");
    }

    private String trimTrailingSlash(String value) {
        return value == null ? "" : value.replaceAll("/+$", "");
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.valueOf(String.valueOf(value));
    }

    private int asInt(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }

    private record ApiKeyIdentity(Long apiKeyId, Long tenantId, String scopes) {
    }

    private record ModelRoute(
            Long modelId,
            String modelCode,
            Long priceVersionId,
            String providerCode,
            String baseUrl,
            String encryptedApiKey,
            int timeoutMs
    ) {
    }
}
