package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.dto.agent.PromptTemplateRequest;
import com.yeho.ai.platform.dto.agent.PromptTemplateResponse;
import com.yeho.ai.platform.dto.agent.PromptVersionResponse;
import com.yeho.ai.platform.entity.PromptTemplate;
import com.yeho.ai.platform.entity.PromptVersion;
import com.yeho.ai.platform.mapper.PromptTemplateMapper;
import com.yeho.ai.platform.mapper.PromptVersionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PromptTemplateService {

    private final PromptTemplateMapper promptTemplateMapper;
    private final PromptVersionMapper promptVersionMapper;

    public List<PromptTemplateResponse> list(Long tenantId) {
        LambdaQueryWrapper<PromptTemplate> wrapper = new LambdaQueryWrapper<PromptTemplate>()
                .eq(tenantId != null, PromptTemplate::getTenantId, tenantId)
                .orderByDesc(PromptTemplate::getUpdatedAt);
        return promptTemplateMapper.selectList(wrapper).stream().map(this::toResponse).toList();
    }

    public PromptTemplateResponse create(PromptTemplateRequest request) {
        PromptTemplate template = new PromptTemplate();
        apply(template, request);
        template.setStatus(normalizeStatus(request.status(), "DRAFT"));
        template.setCreatedAt(LocalDateTime.now());
        template.setUpdatedAt(LocalDateTime.now());
        promptTemplateMapper.insert(template);
        return toResponse(template);
    }

    public PromptTemplateResponse update(Long id, PromptTemplateRequest request) {
        PromptTemplate template = requireTemplate(id);
        apply(template, request);
        if (request.status() != null && !request.status().isBlank()) {
            template.setStatus(normalizeStatus(request.status(), template.getStatus()));
        }
        template.setUpdatedAt(LocalDateTime.now());
        promptTemplateMapper.updateById(template);
        return toResponse(template);
    }

    @Transactional
    public PromptVersionResponse publish(Long id) {
        PromptTemplate template = requireTemplate(id);
        Integer maxVersion = promptVersionMapper.selectList(new LambdaQueryWrapper<PromptVersion>()
                        .eq(PromptVersion::getTemplateId, id)
                        .orderByDesc(PromptVersion::getVersionNo))
                .stream()
                .findFirst()
                .map(PromptVersion::getVersionNo)
                .orElse(0);

        PromptVersion version = new PromptVersion();
        version.setTenantId(template.getTenantId());
        version.setTemplateId(template.getId());
        version.setVersionNo(maxVersion + 1);
        version.setContent(template.getContent());
        version.setStatus("PUBLISHED");
        version.setPublishedAt(LocalDateTime.now());
        version.setCreatedAt(LocalDateTime.now());
        promptVersionMapper.insert(version);

        template.setStatus("PUBLISHED");
        template.setUpdatedAt(LocalDateTime.now());
        promptTemplateMapper.updateById(template);
        return toVersionResponse(version);
    }

    public PromptTemplateResponse disable(Long id) {
        PromptTemplate template = requireTemplate(id);
        template.setStatus("DISABLED");
        template.setUpdatedAt(LocalDateTime.now());
        promptTemplateMapper.updateById(template);
        return toResponse(template);
    }

    public List<PromptVersionResponse> versions(Long templateId) {
        return promptVersionMapper.selectList(new LambdaQueryWrapper<PromptVersion>()
                        .eq(PromptVersion::getTemplateId, templateId)
                        .orderByDesc(PromptVersion::getVersionNo))
                .stream()
                .map(this::toVersionResponse)
                .toList();
    }

    public Long tenantIdOf(Long id) {
        return requireTemplate(id).getTenantId();
    }

    private void apply(PromptTemplate template, PromptTemplateRequest request) {
        if (request.tenantId() != null) {
            template.setTenantId(request.tenantId());
        }
        template.setTemplateCode(request.templateCode());
        template.setTemplateName(request.templateName());
        template.setDescription(request.description());
        template.setContent(request.content());
    }

    private PromptTemplate requireTemplate(Long id) {
        PromptTemplate template = promptTemplateMapper.selectById(id);
        if (template == null) {
            throw new IllegalArgumentException("Prompt template not found");
        }
        return template;
    }

    private String normalizeStatus(String status, String fallback) {
        if (status == null || status.isBlank()) {
            return fallback;
        }
        return status.trim().toUpperCase();
    }

    private PromptTemplateResponse toResponse(PromptTemplate template) {
        return new PromptTemplateResponse(
                template.getId(),
                template.getTenantId(),
                template.getTemplateCode(),
                template.getTemplateName(),
                template.getDescription(),
                template.getContent(),
                template.getStatus(),
                template.getCreatedAt(),
                template.getUpdatedAt()
        );
    }

    private PromptVersionResponse toVersionResponse(PromptVersion version) {
        return new PromptVersionResponse(
                version.getId(),
                version.getTenantId(),
                version.getTemplateId(),
                version.getVersionNo(),
                version.getContent(),
                version.getStatus(),
                version.getPublishedAt(),
                version.getCreatedAt()
        );
    }
}
