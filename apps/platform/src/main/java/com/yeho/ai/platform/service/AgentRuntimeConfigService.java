package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.dto.agent.AgentRuntimeConfigResponse;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.entity.AgentConfig;
import com.yeho.ai.platform.entity.PromptTemplate;
import com.yeho.ai.platform.entity.PromptVersion;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.AgentConfigMapper;
import com.yeho.ai.platform.mapper.PromptTemplateMapper;
import com.yeho.ai.platform.mapper.PromptVersionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgentRuntimeConfigService {
    private final AgentConfigMapper agentConfigMapper;
    private final PromptTemplateMapper promptTemplateMapper;
    private final PromptVersionMapper promptVersionMapper;

    public AgentRuntimeConfigResponse resolve(Long tenantId, String agentCode, GatewayRequestContext context) {
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
        return toResponse(config, resolvePrompt(config));
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
