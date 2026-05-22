package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.agent.AgentExecuteLogResponse;
import com.yeho.ai.platform.service.AgentExecuteLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/agent-execute-logs")
@RequiredArgsConstructor
public class AgentExecuteLogController {

    private final AgentExecuteLogService agentExecuteLogService;

    @GetMapping
    public ApiResponse<List<AgentExecuteLogResponse>> list(
            @RequestParam(required = false) Long tenantId,
            @RequestParam(required = false) String requestId,
            @RequestParam(required = false) String traceId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(agentExecuteLogService.list(tenantId, requestId, traceId, page, size));
    }
}
