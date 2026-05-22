package com.yeho.ai.platform.service;

import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.gateway.GatewayException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApiKeyScopeServiceTest {

    private final ApiKeyScopeService service = new ApiKeyScopeService();

    @Test
    void normalizeScopesDefaultsToChatCompletion() {
        assertThat(service.normalizeScopes(Set.of())).isEqualTo("chat:completion");
        assertThat(service.normalizeScopes(null)).isEqualTo("chat:completion");
    }

    @Test
    void normalizeScopesTrimsSortsAndDeduplicates() {
        assertThat(service.normalizeScopes(Set.of(" usage:read ", "chat:completion", "usage:read")))
            .isEqualTo("chat:completion,usage:read");
    }

    @Test
    void requireScopeAllowsExactScopeAndAdminWildcard() {
        TenantApiKey exact = apiKey("usage:read,chat:completion");
        TenantApiKey admin = apiKey("admin:*");

        assertThatCode(() -> service.requireScope(exact, "chat:completion")).doesNotThrowAnyException();
        assertThatCode(() -> service.requireScope(admin, "provider:test")).doesNotThrowAnyException();
    }

    @Test
    void requireScopeRejectsMissingScope() {
        TenantApiKey apiKey = apiKey("usage:read");

        assertThatThrownBy(() -> service.requireScope(apiKey, "chat:completion"))
            .isInstanceOfSatisfying(GatewayException.class, ex -> {
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                assertThat(ex.getCode()).isEqualTo("insufficient_scope");
            });
    }

    @Test
    void requireScopeRejectsNullApiKey() {
        assertThatThrownBy(() -> service.requireScope(null, "chat:completion"))
            .isInstanceOfSatisfying(GatewayException.class, ex -> {
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                assertThat(ex.getCode()).isEqualTo("invalid_api_key");
            });
    }

    private TenantApiKey apiKey(String scopes) {
        TenantApiKey apiKey = new TenantApiKey();
        apiKey.setScopes(scopes);
        return apiKey;
    }
}
