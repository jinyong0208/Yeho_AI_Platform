package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.dto.workflow.WorkflowRuntimeConfigResponse;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.service.AiApiKeyService;
import com.yeho.ai.platform.service.ApiKeyScopeService;
import com.yeho.ai.platform.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/workflow-runtime")
@RequiredArgsConstructor
public class WorkflowRuntimeConfigController {
    private final AiApiKeyService aiApiKeyService;
    private final ApiKeyScopeService apiKeyScopeService;
    private final WorkflowService workflowService;

    @GetMapping("/configs/{workflowCode}")
    public ApiResponse<WorkflowRuntimeConfigResponse> getConfig(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestHeader(value = "X-Yeho-System-Code", required = false) String systemCode,
            @RequestHeader(value = "X-Yeho-Data-Domain", required = false) String dataDomain,
            @PathVariable String workflowCode
    ) {
        TenantApiKey apiKey = aiApiKeyService.authenticate(authorization);
        GatewayRequestContext context = GatewayRequestContext.of(systemCode, dataDomain, null, workflowCode);
        apiKeyScopeService.requireAnyScope(apiKey, Set.of(
                ApiKeyScopeService.WORKFLOW_READ,
                ApiKeyScopeService.AGENT_READ,
                ApiKeyScopeService.CHAT_COMPLETION
        ));
        apiKeyScopeService.requireBusinessContext(apiKey, context);
        return ApiResponse.ok(workflowService.resolvePublished(apiKey.getTenantId(), workflowCode, context));
    }
}
