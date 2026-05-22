package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.dto.agent.AgentConfigRequest;
import com.yeho.ai.platform.dto.agent.AgentConfigResponse;
import com.yeho.ai.platform.entity.AgentConfig;
import com.yeho.ai.platform.mapper.AgentConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AgentConfigService {

    private final AgentConfigMapper agentConfigMapper;

    public List<AgentConfigResponse> list(Long tenantId) {
        return agentConfigMapper.selectList(new LambdaQueryWrapper<AgentConfig>()
                        .eq(tenantId != null, AgentConfig::getTenantId, tenantId)
                        .orderByDesc(AgentConfig::getUpdatedAt))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public AgentConfigResponse create(AgentConfigRequest request) {
        AgentConfig config = new AgentConfig();
        apply(config, request);
        config.setStatus(normalizeStatus(request.status(), "ACTIVE"));
        config.setTemperature(request.temperature() == null ? BigDecimal.valueOf(0.7) : request.temperature());
        config.setMaxTokens(request.maxTokens() == null ? 2048 : request.maxTokens());
        config.setCreatedAt(LocalDateTime.now());
        config.setUpdatedAt(LocalDateTime.now());
        agentConfigMapper.insert(config);
        return toResponse(config);
    }

    public AgentConfigResponse update(Long id, AgentConfigRequest request) {
        AgentConfig config = requireConfig(id);
        apply(config, request);
        if (request.status() != null && !request.status().isBlank()) {
            config.setStatus(normalizeStatus(request.status(), config.getStatus()));
        }
        config.setUpdatedAt(LocalDateTime.now());
        agentConfigMapper.updateById(config);
        return toResponse(config);
    }

    public AgentConfigResponse disable(Long id) {
        AgentConfig config = requireConfig(id);
        config.setStatus("DISABLED");
        config.setUpdatedAt(LocalDateTime.now());
        agentConfigMapper.updateById(config);
        return toResponse(config);
    }

    private void apply(AgentConfig config, AgentConfigRequest request) {
        if (request.tenantId() != null) {
            config.setTenantId(request.tenantId());
        }
        config.setAgentCode(request.agentCode());
        config.setAgentName(request.agentName());
        config.setDescription(request.description());
        config.setSystemPrompt(request.systemPrompt());
        config.setDefaultModel(request.defaultModel());
        if (request.temperature() != null) {
            config.setTemperature(request.temperature());
        }
        if (request.maxTokens() != null) {
            config.setMaxTokens(request.maxTokens());
        }
    }

    private AgentConfig requireConfig(Long id) {
        AgentConfig config = agentConfigMapper.selectById(id);
        if (config == null) {
            throw new IllegalArgumentException("Agent config not found");
        }
        return config;
    }

    private String normalizeStatus(String status, String fallback) {
        if (status == null || status.isBlank()) {
            return fallback;
        }
        return status.trim().toUpperCase();
    }

    private AgentConfigResponse toResponse(AgentConfig config) {
        return new AgentConfigResponse(
                config.getId(),
                config.getTenantId(),
                config.getAgentCode(),
                config.getAgentName(),
                config.getDescription(),
                config.getSystemPrompt(),
                config.getDefaultModel(),
                config.getTemperature(),
                config.getMaxTokens(),
                config.getStatus(),
                config.getCreatedAt(),
                config.getUpdatedAt()
        );
    }
}
