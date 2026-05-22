package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.RateLimitResponse;
import com.yeho.ai.platform.dto.gateway.RateLimitUpsertRequest;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.RateLimitAdminService;
import com.yeho.ai.platform.service.TenantAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/rate-limits")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN')")
public class RateLimitController {
    private final RateLimitAdminService rateLimitAdminService;
    private final TenantAccessService tenantAccessService;

    @GetMapping
    public ApiResponse<RateLimitResponse> getTenantLimit(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(rateLimitAdminService.getTenantLimit(tenantId));
    }

    @PutMapping
    public ApiResponse<RateLimitResponse> upsertTenantLimit(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @RequestBody RateLimitUpsertRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(rateLimitAdminService.upsertTenantLimit(tenantId, request));
    }

    @GetMapping("/api-keys/{apiKeyId}")
    public ApiResponse<RateLimitResponse> getApiKeyLimit(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long apiKeyId
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(rateLimitAdminService.getApiKeyLimit(tenantId, apiKeyId));
    }

    @PutMapping("/api-keys/{apiKeyId}")
    public ApiResponse<RateLimitResponse> upsertApiKeyLimit(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long apiKeyId,
        @RequestBody RateLimitUpsertRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(rateLimitAdminService.upsertApiKeyLimit(tenantId, apiKeyId, request));
    }
}
