package com.yeho.ai.platform.service;

import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenantAccessServiceTest {

    private final TenantAccessService service = new TenantAccessService();

    @Test
    void superAdminCanAccessAnyTenant() {
        AuthenticatedUser user = user(1L, "SUPER_ADMIN");

        assertThatCode(() -> service.assertTenantAccess(user, 99L)).doesNotThrowAnyException();
        assertThat(service.scopeTenantId(user, 99L)).isEqualTo(99L);
    }

    @Test
    void tenantUserCanOnlyAccessOwnTenant() {
        AuthenticatedUser user = user(10L, "TENANT_ADMIN");

        assertThatCode(() -> service.assertTenantAccess(user, 10L)).doesNotThrowAnyException();
        assertThat(service.scopeTenantId(user, null)).isEqualTo(10L);
        assertThat(service.scopeTenantId(user, 10L)).isEqualTo(10L);
    }

    @Test
    void tenantUserCannotCrossTenant() {
        AuthenticatedUser user = user(10L, "TENANT_ADMIN");

        assertThatThrownBy(() -> service.assertTenantAccess(user, 11L))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Tenant access denied");
        assertThatThrownBy(() -> service.scopeTenantId(user, 11L))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Tenant access denied");
    }

    @Test
    void anonymousUserCannotAccessTenant() {
        assertThatThrownBy(() -> service.assertTenantAccess(null, 10L))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Tenant access denied");
        assertThatThrownBy(() -> service.scopeTenantId(null, 10L))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Tenant access denied");
    }

    private AuthenticatedUser user(Long tenantId, String role) {
        return new AuthenticatedUser(1L, tenantId, "tester", List.of(role));
    }
}
