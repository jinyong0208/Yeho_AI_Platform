package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.agent.AgentConfigRequest;
import com.yeho.ai.platform.dto.agent.AgentConfigResponse;
import com.yeho.ai.platform.service.AgentConfigService;
import lombok.RequiredArgsConstructor;
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
public class AgentConfigController {

    private final AgentConfigService agentConfigService;

    @GetMapping
    public ApiResponse<List<AgentConfigResponse>> list(@RequestParam(required = false) Long tenantId) {
        return ApiResponse.ok(agentConfigService.list(tenantId));
    }

    @PostMapping
    public ApiResponse<AgentConfigResponse> create(@RequestBody AgentConfigRequest request) {
        return ApiResponse.ok(agentConfigService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<AgentConfigResponse> update(@PathVariable Long id, @RequestBody AgentConfigRequest request) {
        return ApiResponse.ok(agentConfigService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<AgentConfigResponse> disable(@PathVariable Long id) {
        return ApiResponse.ok(agentConfigService.disable(id));
    }
}
