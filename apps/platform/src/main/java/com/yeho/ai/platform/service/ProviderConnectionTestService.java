package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProviderConnectionTestService {

    private static final int MAX_ERROR_LENGTH = 500;

    private final JdbcTemplate jdbcTemplate;
    private final ApplicationContext applicationContext;

    public ProviderConnectionTestService(JdbcTemplate jdbcTemplate, ApplicationContext applicationContext) {
        this.jdbcTemplate = jdbcTemplate;
        this.applicationContext = applicationContext;
    }

    public Map<String, Object> testProvider(Long providerId) {
        ProviderRecord provider = loadProvider(providerId);
        String requestId = UUID.randomUUID().toString();
        long startedAt = System.currentTimeMillis();
        String modelCode = resolveProbeModel(provider.id());

        try {
            callProbe(provider, modelCode);
            long latencyMs = latencySince(startedAt);
            updateHealth(provider.id(), "HEALTHY", true);
            recordTest(provider, requestId, true, latencyMs, null, null);
            return Map.of(
                    "requestId", requestId,
                    "providerId", provider.id(),
                    "providerCode", provider.providerCode(),
                    "providerName", provider.providerName(),
                    "modelCode", modelCode,
                    "healthStatus", "HEALTHY",
                    "success", true,
                    "latencyMs", latencyMs
            );
        } catch (Exception ex) {
            long latencyMs = latencySince(startedAt);
            String errorCode = "PROVIDER_TEST_FAILED";
            String errorMessage = sanitizeError(ex.getMessage());
            updateHealth(provider.id(), "UNHEALTHY", false);
            recordTest(provider, requestId, false, latencyMs, errorCode, errorMessage);
            return Map.of(
                    "requestId", requestId,
                    "providerId", provider.id(),
                    "providerCode", provider.providerCode(),
                    "providerName", provider.providerName(),
                    "modelCode", modelCode,
                    "healthStatus", "UNHEALTHY",
                    "success", false,
                    "latencyMs", latencyMs,
                    "errorCode", errorCode,
                    "errorMessage", errorMessage == null ? "Provider test failed" : errorMessage
            );
        }
    }

    public List<Map<String, Object>> listHealth() {
        return jdbcTemplate.queryForList("""
                select p.id as provider_id,
                       p.provider_code,
                       p.provider_name,
                       p.base_url,
                       p.status,
                       coalesce(p.health_status, 'UNKNOWN') as health_status,
                       coalesce(p.consecutive_failures, 0) as consecutive_failures,
                       p.circuit_open_until,
                       p.last_checked_at,
                       l.request_id as last_test_request_id,
                       l.success as last_test_success,
                       l.latency_ms as last_test_latency_ms,
                       l.error_code as last_test_error_code,
                       l.error_message as last_test_error_message,
                       l.tested_at as last_tested_at
                from ai_provider p
                left join lateral (
                    select request_id, success, latency_ms, error_code, error_message, tested_at
                    from provider_test_log
                    where provider_id = p.id
                    order by tested_at desc
                    limit 1
                ) l on true
                order by p.provider_code
                """);
    }

    public List<Map<String, Object>> listRecentTests(Long providerId) {
        return jdbcTemplate.queryForList("""
                select request_id,
                       success,
                       latency_ms,
                       error_code,
                       error_message,
                       tested_at
                from provider_test_log
                where provider_id = ?
                order by tested_at desc
                limit 20
                """, providerId);
    }

    private ProviderRecord loadProvider(Long providerId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select id,
                       provider_code,
                       provider_name,
                       base_url,
                       api_key_encrypted,
                       coalesce(timeout_ms, 30000) as timeout_ms
                from ai_provider
                where id = ? and status = 'ACTIVE'
                limit 1
                """, providerId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Provider not found");
        }
        Map<String, Object> row = rows.get(0);
        return new ProviderRecord(
                asLong(row.get("id")),
                String.valueOf(row.get("provider_code")),
                String.valueOf(row.get("provider_name")),
                String.valueOf(row.get("base_url")),
                String.valueOf(row.get("api_key_encrypted")),
                asInt(row.get("timeout_ms"), 30_000)
        );
    }

    private String resolveProbeModel(Long providerId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select model_code
                from ai_model
                where provider_id = ? and status = 'ACTIVE'
                order by case
                             when lower(model_code) like '%embedding%' then 1
                             else 0
                         end,
                         id
                limit 1
                """, providerId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider has no active model");
        }
        return String.valueOf(rows.get(0).get("model_code"));
    }

    private void callProbe(ProviderRecord provider, String modelCode) {
        String endpoint = trimTrailingSlash(provider.baseUrl()) + "/chat/completions";
        String apiKey = decryptSecret(provider.encryptedApiKey());
        RestClient.builder()
                .baseUrl(endpoint)
                .requestFactory(requestFactory(provider.timeoutMs()))
                .build()
                .post()
                .header("Authorization", "Bearer " + apiKey)
                .body(Map.of(
                        "model", modelCode,
                        "messages", List.of(Map.of("role", "user", "content", "ping")),
                        "temperature", 0,
                        "max_tokens", 8,
                        "stream", false
                ))
                .retrieve()
                .body(String.class);
    }

    private SimpleClientHttpRequestFactory requestFactory(int timeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);
        return requestFactory;
    }

    private void updateHealth(Long providerId, String healthStatus, boolean success) {
        if (success) {
            jdbcTemplate.update("""
                    update ai_provider
                    set health_status = ?,
                        consecutive_failures = 0,
                        circuit_open_until = null,
                        last_checked_at = now(),
                        updated_at = now()
                    where id = ?
                    """, healthStatus, providerId);
            return;
        }
        jdbcTemplate.update("""
                update ai_provider
                set health_status = ?,
                    consecutive_failures = coalesce(consecutive_failures, 0) + 1,
                    last_checked_at = now(),
                    updated_at = now()
                where id = ?
                """, healthStatus, providerId);
    }

    private void recordTest(
            ProviderRecord provider,
            String requestId,
            boolean success,
            long latencyMs,
            String errorCode,
            String errorMessage
    ) {
        jdbcTemplate.update("""
                insert into provider_test_log (
                    id, provider_id, provider_code, request_id, success,
                    latency_ms, error_code, error_message, tested_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, now())
                """,
                IdWorker.getId(),
                provider.id(),
                provider.providerCode(),
                requestId,
                success,
                latencyMs,
                errorCode,
                errorMessage
        );
    }

    private String decryptSecret(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isBlank() || "null".equalsIgnoreCase(encryptedValue)) {
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
                // Continue scanning service beans because the secret service name is intentionally internal.
            } catch (Exception ex) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Provider API key decrypt failed");
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Provider API key decrypt service is unavailable");
    }

    private String sanitizeError(String errorMessage) {
        if (errorMessage == null || errorMessage.isBlank()) {
            return null;
        }
        String sanitized = errorMessage
                .replaceAll("(?i)Bearer\\s+[A-Za-z0-9._\\-]+", "Bearer ***")
                .replaceAll("(?i)(api[_-]?key[\"':= ]+)[A-Za-z0-9._\\-]+", "$1***");
        return sanitized.length() > MAX_ERROR_LENGTH ? sanitized.substring(0, MAX_ERROR_LENGTH) : sanitized;
    }

    private long latencySince(long startedAt) {
        return Math.max(0, System.currentTimeMillis() - startedAt);
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

    private record ProviderRecord(
            Long id,
            String providerCode,
            String providerName,
            String baseUrl,
            String encryptedApiKey,
            int timeoutMs
    ) {
        private String normalizedProviderCode() {
            return providerCode == null ? "" : providerCode.toUpperCase(Locale.ROOT);
        }
    }
}
