package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.user.AdminPasswordResetRequest;
import com.yeho.ai.platform.dto.user.UserCreateRequest;
import com.yeho.ai.platform.dto.user.UserResponse;
import com.yeho.ai.platform.dto.user.UserUpdateRequest;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.TenantAccessService;
import com.yeho.ai.platform.service.TenantUserService;
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
@RequestMapping("/api/v1/tenants/{tenantId}/users")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN')")
public class TenantUserController {
    private final TenantUserService tenantUserService;
    private final TenantAccessService tenantAccessService;

    @PostMapping
    public ApiResponse<UserResponse> create(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @Valid @RequestBody UserCreateRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(tenantUserService.create(tenantId, request));
    }

    @GetMapping
    public ApiResponse<List<UserResponse>> list(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(tenantUserService.list(tenantId));
    }

    @GetMapping("/{userId}")
    public ApiResponse<UserResponse> get(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long userId
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(tenantUserService.get(tenantId, userId));
    }

    @PutMapping("/{userId}")
    public ApiResponse<UserResponse> update(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long userId,
        @Valid @RequestBody UserUpdateRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(tenantUserService.update(tenantId, userId, request));
    }

    @PutMapping("/{userId}/password")
    public ApiResponse<Void> resetPassword(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long userId,
        @Valid @RequestBody AdminPasswordResetRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        tenantUserService.resetPassword(tenantId, userId, request);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{userId}")
    public ApiResponse<Void> delete(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @PathVariable Long userId
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        tenantUserService.delete(tenantId, userId);
        return ApiResponse.ok(null);
    }
}
