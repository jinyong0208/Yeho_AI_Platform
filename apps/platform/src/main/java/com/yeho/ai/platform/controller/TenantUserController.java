package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.user.UserCreateRequest;
import com.yeho.ai.platform.dto.user.UserResponse;
import com.yeho.ai.platform.dto.user.UserUpdateRequest;
import com.yeho.ai.platform.service.TenantUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
public class TenantUserController {
    private final TenantUserService tenantUserService;

    @PostMapping
    public ApiResponse<UserResponse> create(
        @PathVariable Long tenantId,
        @Valid @RequestBody UserCreateRequest request
    ) {
        return ApiResponse.ok(tenantUserService.create(tenantId, request));
    }

    @GetMapping
    public ApiResponse<List<UserResponse>> list(@PathVariable Long tenantId) {
        return ApiResponse.ok(tenantUserService.list(tenantId));
    }

    @GetMapping("/{userId}")
    public ApiResponse<UserResponse> get(@PathVariable Long tenantId, @PathVariable Long userId) {
        return ApiResponse.ok(tenantUserService.get(tenantId, userId));
    }

    @PutMapping("/{userId}")
    public ApiResponse<UserResponse> update(
        @PathVariable Long tenantId,
        @PathVariable Long userId,
        @Valid @RequestBody UserUpdateRequest request
    ) {
        return ApiResponse.ok(tenantUserService.update(tenantId, userId, request));
    }

    @DeleteMapping("/{userId}")
    public ApiResponse<Void> delete(@PathVariable Long tenantId, @PathVariable Long userId) {
        tenantUserService.delete(tenantId, userId);
        return ApiResponse.ok(null);
    }
}
