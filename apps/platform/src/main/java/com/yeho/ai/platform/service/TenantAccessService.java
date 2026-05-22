package com.yeho.ai.platform.service;

import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.security.AuthenticatedUser;
import org.springframework.stereotype.Service;

@Service
public class TenantAccessService {
    public boolean isSuperAdmin(AuthenticatedUser user) {
        return user != null && user.roles() != null && user.roles().contains("SUPER_ADMIN");
    }

    public void assertTenantAccess(AuthenticatedUser user, Long tenantId) {
        if (isSuperAdmin(user)) {
            return;
        }
        if (user == null || tenantId == null || !tenantId.equals(user.tenantId())) {
            throw new BusinessException("Tenant access denied");
        }
    }

    public Long scopeTenantId(AuthenticatedUser user, Long requestedTenantId) {
        if (user == null) {
            throw new BusinessException("Tenant access denied");
        }
        if (isSuperAdmin(user)) {
            return requestedTenantId;
        }
        if (requestedTenantId != null && !requestedTenantId.equals(user.tenantId())) {
            throw new BusinessException("Tenant access denied");
        }
        return user.tenantId();
    }
}
