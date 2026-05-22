package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.ApiKeyCreateRequest;
import com.yeho.ai.platform.dto.gateway.ApiKeyCreateResponse;
import com.yeho.ai.platform.dto.gateway.ApiKeyResponse;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.TenantAccessService;
import com.yeho.ai.platform.service.TenantApiKeyAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/api-keys")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','DEVELOPER')")
public class TenantApiKeyController {
    private final TenantApiKeyAdminService tenantApiKeyAdminService;
    private final TenantAccessService tenantAccessService;

    @PostMapping
    public ApiResponse<ApiKeyCreateResponse> create(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @Valid @RequestBody ApiKeyCreateRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(tenantApiKeyAdminService.create(tenantId, request));
    }

    @GetMapping
    public ApiResponse<List<ApiKeyResponse>> list(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(tenantApiKeyAdminService.list(tenantId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> revoke(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        tenantApiKeyAdminService.revoke(tenantId, id);
        return ApiResponse.ok(null);
    }
}
