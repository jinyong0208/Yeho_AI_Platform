package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.workflow.WorkflowRequest;
import com.yeho.ai.platform.dto.workflow.WorkflowResponse;
import com.yeho.ai.platform.dto.workflow.WorkflowVersionResponse;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.TenantAccessService;
import com.yeho.ai.platform.service.WorkflowService;
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
@RequestMapping("/api/v1/workflows")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN')")
public class WorkflowController {
    private final WorkflowService workflowService;
    private final TenantAccessService tenantAccessService;

    @GetMapping
    public ApiResponse<List<WorkflowResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) Long tenantId
    ) {
        return ApiResponse.ok(workflowService.list(tenantAccessService.scopeTenantId(user, tenantId)));
    }

    @PostMapping
    public ApiResponse<WorkflowResponse> create(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody WorkflowRequest request
    ) {
        Long scopedTenantId = tenantAccessService.scopeTenantId(user, request.tenantId());
        return ApiResponse.ok(workflowService.create(withTenant(request, scopedTenantId)));
    }

    @PutMapping("/{id}")
    public ApiResponse<WorkflowResponse> update(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @RequestBody WorkflowRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, workflowService.tenantIdOf(id));
        Long scopedTenantId = tenantAccessService.scopeTenantId(user, request.tenantId());
        return ApiResponse.ok(workflowService.update(id, withTenant(request, scopedTenantId)));
    }

    @PostMapping("/{id}/publish")
    public ApiResponse<WorkflowVersionResponse> publish(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, workflowService.tenantIdOf(id));
        return ApiResponse.ok(workflowService.publish(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<WorkflowResponse> disable(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, workflowService.tenantIdOf(id));
        return ApiResponse.ok(workflowService.disable(id));
    }

    @GetMapping("/{id}/versions")
    public ApiResponse<List<WorkflowVersionResponse>> versions(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, workflowService.tenantIdOf(id));
        return ApiResponse.ok(workflowService.versions(id));
    }

    private WorkflowRequest withTenant(WorkflowRequest request, Long tenantId) {
        return new WorkflowRequest(
                tenantId,
                request.workflowCode(),
                request.workflowName(),
                request.description(),
                request.systemCode(),
                request.dataDomain(),
                request.agentCode(),
                request.defaultModel(),
                request.schemaJson(),
                request.status()
        );
    }
}
