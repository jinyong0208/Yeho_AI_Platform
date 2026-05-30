package com.yeho.ai.platform.service;

import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.gateway.GatewayException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ApiKeyScopeService {
    public static final String CHAT_COMPLETION = "chat:completion";
    public static final String AGENT_READ = "agent:read";
    public static final String WORKFLOW_READ = "workflow:read";

    public void requireScope(TenantApiKey apiKey, String requiredScope) {
        if (apiKey == null) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "invalid_api_key", "Invalid API key");
        }
        Set<String> scopes = parseScopes(apiKey.getScopes());
        if (scopes.contains("admin:*") || scopes.contains(requiredScope)) {
            return;
        }
        throw new GatewayException(HttpStatus.FORBIDDEN, "insufficient_scope", "API key scope is not allowed");
    }

    public void requireAnyScope(TenantApiKey apiKey, Set<String> requiredScopes) {
        if (apiKey == null) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "invalid_api_key", "Invalid API key");
        }
        Set<String> scopes = parseScopes(apiKey.getScopes());
        if (scopes.contains("admin:*") || requiredScopes.stream().anyMatch(scopes::contains)) {
            return;
        }
        throw new GatewayException(HttpStatus.FORBIDDEN, "insufficient_scope", "API key scope is not allowed");
    }

    public void requireBusinessContext(TenantApiKey apiKey, GatewayRequestContext context) {
        if (apiKey == null) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "invalid_api_key", "Invalid API key");
        }
        requireAllowedValue(
            apiKey.getAllowedSystemCodes(),
            context == null ? null : context.systemCode(),
            "system_code",
            "X-Yeho-System-Code"
        );
        requireAllowedValue(
            apiKey.getAllowedDataDomains(),
            context == null ? null : context.dataDomain(),
            "data_domain",
            "X-Yeho-Data-Domain"
        );
    }

    public Set<String> parseScopes(String scopes) {
        if (!StringUtils.hasText(scopes)) {
            return Set.of();
        }
        return Arrays.stream(scopes.split(","))
            .map(String::trim)
            .filter(StringUtils::hasText)
            .collect(Collectors.toUnmodifiableSet());
    }

    public String normalizeScopes(Set<String> scopes) {
        if (scopes == null || scopes.isEmpty()) {
            return CHAT_COMPLETION;
        }
        return scopes.stream()
            .map(String::trim)
            .filter(StringUtils::hasText)
            .distinct()
            .sorted()
            .collect(Collectors.joining(","));
    }

    public Set<String> parseCodes(String codes) {
        if (!StringUtils.hasText(codes)) {
            return Set.of();
        }
        return Arrays.stream(codes.split(","))
            .map(String::trim)
            .filter(StringUtils::hasText)
            .map(String::toLowerCase)
            .collect(Collectors.toUnmodifiableSet());
    }

    public String normalizeCodes(Set<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return null;
        }
        String normalized = codes.stream()
            .map(String::trim)
            .filter(StringUtils::hasText)
            .map(String::toLowerCase)
            .distinct()
            .sorted()
            .collect(Collectors.joining(","));
        return StringUtils.hasText(normalized) ? normalized : null;
    }

    private void requireAllowedValue(String allowedCsv, String actualValue, String fieldName, String headerName) {
        Set<String> allowedValues = parseCodes(allowedCsv);
        if (allowedValues.isEmpty() || allowedValues.contains("*")) {
            return;
        }
        if (!StringUtils.hasText(actualValue)) {
            throw new GatewayException(
                HttpStatus.FORBIDDEN,
                "insufficient_context_scope",
                "API key requires " + headerName
            );
        }
        if (!allowedValues.contains(actualValue.trim().toLowerCase())) {
            throw new GatewayException(
                HttpStatus.FORBIDDEN,
                "insufficient_context_scope",
                "API key is not allowed for this " + fieldName
            );
        }
    }
}
