package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.ModelCreateRequest;
import com.yeho.ai.platform.dto.gateway.ModelPriceVersionCreateRequest;
import com.yeho.ai.platform.dto.gateway.ModelPriceVersionResponse;
import com.yeho.ai.platform.dto.gateway.ModelResponse;
import com.yeho.ai.platform.dto.gateway.ModelUpdateRequest;
import com.yeho.ai.platform.service.AiModelAdminService;
import com.yeho.ai.platform.service.AiModelPriceVersionService;
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
@RequestMapping("/api/v1/models")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AiModelController {
    private final AiModelAdminService aiModelAdminService;
    private final AiModelPriceVersionService aiModelPriceVersionService;

    @PostMapping
    public ApiResponse<ModelResponse> create(@Valid @RequestBody ModelCreateRequest request) {
        return ApiResponse.ok(aiModelAdminService.create(request));
    }

    @GetMapping
    public ApiResponse<List<ModelResponse>> list() {
        return ApiResponse.ok(aiModelAdminService.list());
    }

    @GetMapping("/{id}")
    public ApiResponse<ModelResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(aiModelAdminService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<ModelResponse> update(
        @PathVariable Long id,
        @RequestBody ModelUpdateRequest request
    ) {
        return ApiResponse.ok(aiModelAdminService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> disable(@PathVariable Long id) {
        aiModelAdminService.disable(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/{id}/price-versions")
    public ApiResponse<List<ModelPriceVersionResponse>> priceVersions(@PathVariable Long id) {
        return ApiResponse.ok(aiModelPriceVersionService.list(id));
    }

    @PostMapping("/{id}/price-versions")
    public ApiResponse<ModelPriceVersionResponse> createPriceVersion(
        @PathVariable Long id,
        @RequestBody ModelPriceVersionCreateRequest request
    ) {
        return ApiResponse.ok(aiModelPriceVersionService.create(id, request));
    }
}
