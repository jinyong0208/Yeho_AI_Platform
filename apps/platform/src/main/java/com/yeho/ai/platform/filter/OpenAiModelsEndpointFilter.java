package com.yeho.ai.platform.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 3)
public class OpenAiModelsEndpointFilter extends OncePerRequestFilter {

    private static final String MODELS_READ_SCOPE = "models:read";

    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public OpenAiModelsEndpointFilter(ObjectMapper objectMapper, JdbcTemplate jdbcTemplate) {
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!isModelsRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            ApiKeyIdentity apiKey = authenticate(request.getHeader(HttpHeaders.AUTHORIZATION));
            requireScope(apiKey);
            writeJson(response, HttpStatus.OK, listModels());
        } catch (ResponseStatusException ex) {
            OpenAiErrorResponseWriter.write(
                    objectMapper,
                    request,
                    response,
                    HttpStatus.valueOf(ex.getStatusCode().value()),
                    ex.getReason()
            );
        } catch (Exception ex) {
            OpenAiErrorResponseWriter.write(objectMapper, request, response, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    private boolean isModelsRequest(HttpServletRequest request) {
        return "GET".equalsIgnoreCase(request.getMethod()) && "/v1/models".equals(request.getRequestURI());
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
        if (!scopes.contains(MODELS_READ_SCOPE) && !scopes.contains("admin:*")) {
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

    private Map<String, Object> listModels() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select m.model_code as id,
                       'model' as object,
                       extract(epoch from coalesce(m.created_at, now()))::bigint as created,
                       p.provider_code as owned_by
                from ai_model m
                join ai_provider p on p.id = m.provider_id
                where m.status = 'ACTIVE'
                  and p.status = 'ACTIVE'
                order by m.model_code
                """);
        List<Map<String, Object>> models = rows.stream()
                .map(row -> {
                    Map<String, Object> model = new LinkedHashMap<>();
                    model.put("id", row.get("id"));
                    model.put("object", "model");
                    model.put("created", Math.toIntExact(asLong(row.get("created"))));
                    model.put("owned_by", row.get("owned_by"));
                    return model;
                })
                .toList();
        return Map.of(
                "object", "list",
                "data", models
        );
    }

    private void writeJson(HttpServletResponse response, HttpStatus status, Object body) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), body);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash API key", ex);
        }
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.valueOf(String.valueOf(value));
    }

    private record ApiKeyIdentity(Long apiKeyId, Long tenantId, String scopes) {
    }
}
