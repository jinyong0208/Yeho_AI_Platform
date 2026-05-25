package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.agent.AgentRuntimeConfigResponse;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.service.AgentRuntimeConfigService;
import com.yeho.ai.platform.service.AiApiKeyService;
import com.yeho.ai.platform.service.ApiKeyScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/agent-runtime")
@RequiredArgsConstructor
public class AgentRuntimeConfigController {
    private final AiApiKeyService aiApiKeyService;
    private final ApiKeyScopeService apiKeyScopeService;
    private final AgentRuntimeConfigService agentRuntimeConfigService;

    @GetMapping("/configs/{agentCode}")
    public ApiResponse<AgentRuntimeConfigResponse> getConfig(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestHeader(value = "X-Yeho-System-Code", required = false) String systemCode,
            @RequestHeader(value = "X-Yeho-Data-Domain", required = false) String dataDomain,
            @PathVariable String agentCode
    ) {
        TenantApiKey apiKey = aiApiKeyService.authenticate(authorization);
        GatewayRequestContext context = GatewayRequestContext.of(systemCode, dataDomain, agentCode);
        apiKeyScopeService.requireAnyScope(apiKey, Set.of(ApiKeyScopeService.AGENT_READ, ApiKeyScopeService.CHAT_COMPLETION));
        apiKeyScopeService.requireBusinessContext(apiKey, context);
        return ApiResponse.ok(agentRuntimeConfigService.resolve(apiKey.getTenantId(), agentCode, context));
    }
}
