package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.agent.PromptTemplateRequest;
import com.yeho.ai.platform.dto.agent.PromptTemplateResponse;
import com.yeho.ai.platform.dto.agent.PromptVersionResponse;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.PromptTemplateService;
import com.yeho.ai.platform.service.TenantAccessService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/prompt-templates")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN')")
public class PromptTemplateController {

    private final PromptTemplateService promptTemplateService;
    private final TenantAccessService tenantAccessService;

    @GetMapping
    public ApiResponse<List<PromptTemplateResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) Long tenantId
    ) {
        return ApiResponse.ok(promptTemplateService.list(tenantAccessService.scopeTenantId(user, tenantId)));
    }

    @PostMapping
    public ApiResponse<PromptTemplateResponse> create(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody PromptTemplateRequest request
    ) {
        Long scopedTenantId = tenantAccessService.scopeTenantId(user, request.tenantId());
        return ApiResponse.ok(promptTemplateService.create(withTenant(request, scopedTenantId)));
    }

    @PutMapping("/{id}")
    public ApiResponse<PromptTemplateResponse> update(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @RequestBody PromptTemplateRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, promptTemplateService.tenantIdOf(id));
        Long scopedTenantId = tenantAccessService.scopeTenantId(user, request.tenantId());
        return ApiResponse.ok(promptTemplateService.update(id, withTenant(request, scopedTenantId)));
    }

    @PostMapping("/{id}/publish")
    public ApiResponse<PromptVersionResponse> publish(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, promptTemplateService.tenantIdOf(id));
        return ApiResponse.ok(promptTemplateService.publish(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<PromptTemplateResponse> disable(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, promptTemplateService.tenantIdOf(id));
        return ApiResponse.ok(promptTemplateService.disable(id));
    }

    @GetMapping("/{id}/versions")
    public ApiResponse<List<PromptVersionResponse>> versions(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, promptTemplateService.tenantIdOf(id));
        return ApiResponse.ok(promptTemplateService.versions(id));
    }

    private PromptTemplateRequest withTenant(PromptTemplateRequest request, Long tenantId) {
        return new PromptTemplateRequest(
                tenantId,
                request.templateCode(),
                request.templateName(),
                request.description(),
                request.content(),
                request.status()
        );
    }
}
