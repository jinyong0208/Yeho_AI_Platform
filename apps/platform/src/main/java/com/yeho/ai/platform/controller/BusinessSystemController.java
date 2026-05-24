package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.system.BusinessSystemRequest;
import com.yeho.ai.platform.dto.system.BusinessSystemResponse;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.BusinessSystemService;
import com.yeho.ai.platform.service.TenantAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/business-systems")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN')")
public class BusinessSystemController {
    private final BusinessSystemService businessSystemService;
    private final TenantAccessService tenantAccessService;

    @GetMapping
    public ApiResponse<List<BusinessSystemResponse>> list(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(businessSystemService.list(tenantId));
    }

    @PostMapping
    public ApiResponse<BusinessSystemResponse> create(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @Valid @RequestBody BusinessSystemRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(businessSystemService.create(tenantId, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<BusinessSystemResponse> update(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long id,
        @Valid @RequestBody BusinessSystemRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(businessSystemService.update(tenantId, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<BusinessSystemResponse> disable(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(businessSystemService.disable(tenantId, id));
    }
}
