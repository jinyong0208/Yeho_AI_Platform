package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.RequestContext;
import com.yeho.ai.platform.dto.agent.AgentRuntimeConfigResponse;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.entity.AgentConfig;
import com.yeho.ai.platform.entity.AgentExecuteLog;
import com.yeho.ai.platform.entity.PromptTemplate;
import com.yeho.ai.platform.entity.PromptVersion;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.AgentConfigMapper;
import com.yeho.ai.platform.mapper.AgentExecuteLogMapper;
import com.yeho.ai.platform.mapper.PromptTemplateMapper;
import com.yeho.ai.platform.mapper.PromptVersionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgentRuntimeConfigService {
    private final AgentConfigMapper agentConfigMapper;
    private final AgentExecuteLogMapper agentExecuteLogMapper;
    private final PromptTemplateMapper promptTemplateMapper;
    private final PromptVersionMapper promptVersionMapper;

    public AgentRuntimeConfigResponse resolve(Long tenantId, String agentCode, GatewayRequestContext context) {
        long startTime = System.currentTimeMillis();
        String normalizedAgentCode = normalizeCode(agentCode);
        if (!StringUtils.hasText(normalizedAgentCode)) {
            throw new GatewayException(HttpStatus.BAD_REQUEST, "missing_agent_code", "Missing agent_code");
        }
        AgentConfig config = agentConfigMapper.selectOne(new LambdaQueryWrapper<AgentConfig>()
                .eq(AgentConfig::getTenantId, tenantId)
                .eq(AgentConfig::getAgentCode, normalizedAgentCode)
                .eq(AgentConfig::getStatus, "ACTIVE"));
        if (config == null) {
            throw new GatewayException(HttpStatus.NOT_FOUND, "agent_not_found", "Agent config not found");
        }
        requireAgentContext(config, context == null ? GatewayRequestContext.empty() : context);
        AgentRuntimeConfigResponse response = toResponse(config, resolvePrompt(config));
        recordRuntimeConfigRead(config, context == null ? GatewayRequestContext.empty() : context, startTime);
        return response;
    }

    private void recordRuntimeConfigRead(AgentConfig config, GatewayRequestContext context, long startTime) {
        String requestId = StringUtils.hasText(RequestContext.getRequestId())
                ? RequestContext.getRequestId()
                : UUID.randomUUID().toString();
        AgentExecuteLog log = new AgentExecuteLog();
        log.setRequestId(requestId);
        log.setTenantId(config.getTenantId());
        log.setAgentConfigId(config.getId());
        log.setSystemCode(StringUtils.hasText(context.systemCode()) ? context.systemCode() : config.getSystemCode());
        log.setDataDomain(StringUtils.hasText(context.dataDomain()) ? context.dataDomain() : config.getDataDomain());
        log.setAgentCode(config.getAgentCode());
        log.setWorkflowCode(context.workflowCode());
        log.setModel(config.getDefaultModel());
        log.setLatencyMs(System.currentTimeMillis() - startTime);
        log.setInputTokens(0L);
        log.setOutputTokens(0L);
        log.setTotalTokens(0L);
        log.setChargeCredits(0L);
        log.setSuccess(true);
        log.setTraceId(requestId);
        log.setCreatedAt(LocalDateTime.now());
        agentExecuteLogMapper.insert(log);
    }

    private void requireAgentContext(AgentConfig config, GatewayRequestContext context) {
        if (StringUtils.hasText(config.getSystemCode()) && !"*".equals(config.getSystemCode())) {
            String actualSystemCode = normalizeCode(context.systemCode());
            if (!StringUtils.hasText(actualSystemCode) || !config.getSystemCode().equals(actualSystemCode)) {
                throw new GatewayException(
                        HttpStatus.FORBIDDEN,
                        "agent_context_not_allowed",
                        "Agent is not allowed for this system_code"
                );
            }
        }

        Set<String> allowedDataDomains = parseCodes(config.getAllowedDataDomains());
        if (allowedDataDomains.isEmpty() && StringUtils.hasText(config.getDataDomain())) {
            allowedDataDomains = Set.of(config.getDataDomain());
        }
        if (allowedDataDomains.isEmpty() || allowedDataDomains.contains("*")) {
            return;
        }
        String actualDataDomain = normalizeCode(context.dataDomain());
        if (!StringUtils.hasText(actualDataDomain)) {
            throw new GatewayException(
                    HttpStatus.FORBIDDEN,
                    "agent_context_not_allowed",
                    "Agent requires X-Yeho-Data-Domain"
            );
        }
        if (!allowedDataDomains.contains(actualDataDomain)) {
            throw new GatewayException(
                    HttpStatus.FORBIDDEN,
                    "agent_context_not_allowed",
                    "Agent is not allowed for this data_domain"
            );
        }
    }

    private AgentRuntimeConfigResponse.RuntimePromptTemplate resolvePrompt(AgentConfig config) {
        String templateCode = StringUtils.hasText(config.getPromptTemplateCode())
                ? config.getPromptTemplateCode()
                : config.getAgentCode();
        PromptTemplate template = promptTemplateMapper.selectOne(new LambdaQueryWrapper<PromptTemplate>()
                .eq(PromptTemplate::getTenantId, config.getTenantId())
                .eq(PromptTemplate::getTemplateCode, templateCode)
                .eq(PromptTemplate::getStatus, "PUBLISHED"));
        if (template == null) {
            return null;
        }
        PromptVersion version = promptVersionMapper.selectList(new LambdaQueryWrapper<PromptVersion>()
                        .eq(PromptVersion::getTemplateId, template.getId())
                        .eq(PromptVersion::getStatus, "PUBLISHED")
                        .orderByDesc(PromptVersion::getVersionNo))
                .stream()
                .findFirst()
                .orElse(null);
        return new AgentRuntimeConfigResponse.RuntimePromptTemplate(
                template.getId(),
                template.getTemplateCode(),
                template.getTemplateName(),
                template.getDescription(),
                version == null ? null : version.getVersionNo(),
                version == null ? template.getContent() : version.getContent(),
                template.getStatus(),
                version == null ? null : version.getPublishedAt()
        );
    }

    private AgentRuntimeConfigResponse toResponse(
            AgentConfig config,
            AgentRuntimeConfigResponse.RuntimePromptTemplate promptTemplate
    ) {
        return new AgentRuntimeConfigResponse(
                config.getTenantId(),
                config.getSystemCode(),
                config.getDataDomain(),
                config.getAllowedDataDomains(),
                config.getAgentCode(),
                config.getPromptTemplateCode(),
                config.getAgentName(),
                config.getDescription(),
                config.getSystemPrompt(),
                config.getDefaultModel(),
                config.getTemperature(),
                config.getMaxTokens(),
                config.getStatus(),
                promptTemplate
        );
    }

    private Set<String> parseCodes(String codes) {
        if (!StringUtils.hasText(codes)) {
            return Set.of();
        }
        return Arrays.stream(codes.split(","))
                .map(this::normalizeCode)
                .filter(StringUtils::hasText)
                .collect(Collectors.toUnmodifiableSet());
    }

    private String normalizeCode(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase() : null;
    }
}
