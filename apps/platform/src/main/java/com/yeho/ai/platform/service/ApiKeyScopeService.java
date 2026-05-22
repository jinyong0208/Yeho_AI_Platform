package com.yeho.ai.platform.service;

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
}
