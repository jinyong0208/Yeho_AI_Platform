package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.agent.AgentConfigRequest;
import com.yeho.ai.platform.dto.agent.AgentConfigResponse;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.AgentConfigService;
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
@RequestMapping("/api/v1/agent-configs")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN')")
public class AgentConfigController {

    private final AgentConfigService agentConfigService;
    private final TenantAccessService tenantAccessService;

    @GetMapping
    public ApiResponse<List<AgentConfigResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) Long tenantId
    ) {
        return ApiResponse.ok(agentConfigService.list(tenantAccessService.scopeTenantId(user, tenantId)));
    }

    @PostMapping
    public ApiResponse<AgentConfigResponse> create(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody AgentConfigRequest request
    ) {
        Long scopedTenantId = tenantAccessService.scopeTenantId(user, request.tenantId());
        return ApiResponse.ok(agentConfigService.create(withTenant(request, scopedTenantId)));
    }

    @PutMapping("/{id}")
    public ApiResponse<AgentConfigResponse> update(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @RequestBody AgentConfigRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, agentConfigService.tenantIdOf(id));
        Long scopedTenantId = tenantAccessService.scopeTenantId(user, request.tenantId());
        return ApiResponse.ok(agentConfigService.update(id, withTenant(request, scopedTenantId)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<AgentConfigResponse> disable(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, agentConfigService.tenantIdOf(id));
        return ApiResponse.ok(agentConfigService.disable(id));
    }

    private AgentConfigRequest withTenant(AgentConfigRequest request, Long tenantId) {
        return new AgentConfigRequest(
                tenantId,
                request.agentCode(),
                request.agentName(),
                request.description(),
                request.systemPrompt(),
                request.defaultModel(),
                request.temperature(),
                request.maxTokens(),
                request.status()
        );
    }
}
