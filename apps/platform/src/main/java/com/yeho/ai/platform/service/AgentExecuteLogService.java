package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yeho.ai.platform.dto.agent.AgentExecuteLogResponse;
import com.yeho.ai.platform.entity.AgentExecuteLog;
import com.yeho.ai.platform.mapper.AgentExecuteLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AgentExecuteLogService {

    private final AgentExecuteLogMapper agentExecuteLogMapper;

    public List<AgentExecuteLogResponse> list(Long tenantId, String requestId, String traceId, int page, int size) {
        Page<AgentExecuteLog> result = agentExecuteLogMapper.selectPage(
                Page.of(Math.max(page, 1), Math.min(Math.max(size, 1), 100)),
                new LambdaQueryWrapper<AgentExecuteLog>()
                        .eq(tenantId != null, AgentExecuteLog::getTenantId, tenantId)
                        .eq(requestId != null && !requestId.isBlank(), AgentExecuteLog::getRequestId, requestId)
                        .eq(traceId != null && !traceId.isBlank(), AgentExecuteLog::getTraceId, traceId)
                        .orderByDesc(AgentExecuteLog::getCreatedAt)
        );
        return result.getRecords().stream().map(this::toResponse).toList();
    }

    public void record(AgentExecuteLog log) {
        agentExecuteLogMapper.insert(log);
    }

    private AgentExecuteLogResponse toResponse(AgentExecuteLog log) {
        return new AgentExecuteLogResponse(
                log.getId(),
                log.getRequestId(),
                log.getTenantId(),
                log.getAgentConfigId(),
                log.getAgentCode(),
                log.getModel(),
                log.getLatencyMs(),
                log.getInputTokens(),
                log.getOutputTokens(),
                log.getTotalTokens(),
                log.getChargeCredits(),
                log.getSuccess(),
                log.getErrorCode(),
                log.getErrorMessage(),
                log.getTraceId(),
                log.getCreatedAt()
        );
    }
}
