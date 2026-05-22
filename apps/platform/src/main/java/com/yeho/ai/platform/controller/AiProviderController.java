package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.ProviderCreateRequest;
import com.yeho.ai.platform.dto.gateway.ProviderResponse;
import com.yeho.ai.platform.dto.gateway.ProviderUpdateRequest;
import com.yeho.ai.platform.service.AiProviderAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/v1/providers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AiProviderController {
    private final AiProviderAdminService aiProviderAdminService;

    @PostMapping
    public ApiResponse<ProviderResponse> create(@Valid @RequestBody ProviderCreateRequest request) {
        return ApiResponse.ok(aiProviderAdminService.create(request));
    }

    @GetMapping
    public ApiResponse<List<ProviderResponse>> list() {
        return ApiResponse.ok(aiProviderAdminService.list());
    }

    @GetMapping("/{id}")
    public ApiResponse<ProviderResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(aiProviderAdminService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<ProviderResponse> update(
        @PathVariable Long id,
        @RequestBody ProviderUpdateRequest request
    ) {
        return ApiResponse.ok(aiProviderAdminService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> disable(@PathVariable Long id) {
        aiProviderAdminService.disable(id);
        return ApiResponse.ok(null);
    }
}
