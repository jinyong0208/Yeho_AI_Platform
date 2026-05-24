package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.agent.AgentRunRequest;
import com.yeho.ai.platform.dto.agent.AgentRunResponse;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.AgentClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','DEVELOPER')")
public class AgentController {
    private final AgentClientService agentClientService;

    @PostMapping("/demo/run")
    public ApiResponse<AgentRunResponse> runDemo(
        @AuthenticationPrincipal AuthenticatedUser user,
        @Valid @RequestBody AgentRunRequest request
    ) {
        return ApiResponse.ok(agentClientService.runDemo(request, user));
    }
}
