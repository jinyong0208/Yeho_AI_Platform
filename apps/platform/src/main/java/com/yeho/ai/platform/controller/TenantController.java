package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.tenant.TenantCreateRequest;
import com.yeho.ai.platform.dto.tenant.TenantResponse;
import com.yeho.ai.platform.dto.tenant.TenantUpdateRequest;
import com.yeho.ai.platform.service.TenantService;
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
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class TenantController {
    private final TenantService tenantService;

    @PostMapping
    public ApiResponse<TenantResponse> create(@Valid @RequestBody TenantCreateRequest request) {
        return ApiResponse.ok(tenantService.create(request));
    }

    @GetMapping
    public ApiResponse<List<TenantResponse>> list() {
        return ApiResponse.ok(tenantService.list());
    }

    @GetMapping("/{id}")
    public ApiResponse<TenantResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(tenantService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<TenantResponse> update(
        @PathVariable Long id,
        @Valid @RequestBody TenantUpdateRequest request
    ) {
        return ApiResponse.ok(tenantService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        tenantService.delete(id);
        return ApiResponse.ok(null);
    }
}
