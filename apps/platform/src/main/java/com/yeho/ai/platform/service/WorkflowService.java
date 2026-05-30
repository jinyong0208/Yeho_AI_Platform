package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.dto.workflow.WorkflowRequest;
import com.yeho.ai.platform.dto.workflow.WorkflowResponse;
import com.yeho.ai.platform.dto.workflow.WorkflowRuntimeConfigResponse;
import com.yeho.ai.platform.dto.workflow.WorkflowVersionResponse;
import com.yeho.ai.platform.entity.WorkflowDefinition;
import com.yeho.ai.platform.entity.WorkflowVersion;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.TenantMapper;
import com.yeho.ai.platform.mapper.WorkflowDefinitionMapper;
import com.yeho.ai.platform.mapper.WorkflowVersionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkflowService {
    private static final String DEFAULT_SCHEMA = """
            {"version":"1","input":{},"steps":[],"output":{}}
            """;

    private final WorkflowDefinitionMapper workflowDefinitionMapper;
    private final WorkflowVersionMapper workflowVersionMapper;
    private final TenantMapper tenantMapper;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<WorkflowResponse> list(Long tenantId) {
        return workflowDefinitionMapper.selectList(new LambdaQueryWrapper<WorkflowDefinition>()
                        .eq(tenantId != null, WorkflowDefinition::getTenantId, tenantId)
                        .orderByDesc(WorkflowDefinition::getUpdatedAt))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WorkflowResponse create(WorkflowRequest request) {
        assertTenantExists(request.tenantId());
        WorkflowDefinition workflow = new WorkflowDefinition();
        apply(workflow, request);
        workflow.setStatus(normalizeStatus(request.status(), "DRAFT"));
        assertWorkflowCodeAvailable(workflow.getTenantId(), workflow.getWorkflowCode(), null);
        workflow.setCreatedAt(LocalDateTime.now());
        workflow.setUpdatedAt(LocalDateTime.now());
        workflowDefinitionMapper.insert(workflow);
        return toResponse(workflow);
    }

    @Transactional
    public WorkflowResponse update(Long id, WorkflowRequest request) {
        WorkflowDefinition workflow = requireWorkflow(id);
        apply(workflow, request);
        if (StringUtils.hasText(request.status())) {
            workflow.setStatus(normalizeStatus(request.status(), workflow.getStatus()));
        }
        assertWorkflowCodeAvailable(workflow.getTenantId(), workflow.getWorkflowCode(), id);
        workflow.setUpdatedAt(LocalDateTime.now());
        workflowDefinitionMapper.updateById(workflow);
        return toResponse(workflow);
    }

    @Transactional
    public WorkflowResponse disable(Long id) {
        WorkflowDefinition workflow = requireWorkflow(id);
        workflow.setStatus("DISABLED");
        workflow.setUpdatedAt(LocalDateTime.now());
        workflowDefinitionMapper.updateById(workflow);
        return toResponse(workflow);
    }

    @Transactional
    public WorkflowVersionResponse publish(Long id) {
        WorkflowDefinition workflow = requireWorkflow(id);
        if ("DISABLED".equals(workflow.getStatus())) {
            throw new BusinessException("Workflow is disabled");
        }
        Integer maxVersion = workflowVersionMapper.selectList(new LambdaQueryWrapper<WorkflowVersion>()
                        .eq(WorkflowVersion::getWorkflowId, id)
                        .orderByDesc(WorkflowVersion::getVersionNo))
                .stream()
                .findFirst()
                .map(WorkflowVersion::getVersionNo)
                .orElse(0);

        WorkflowVersion version = new WorkflowVersion();
        version.setTenantId(workflow.getTenantId());
        version.setWorkflowId(workflow.getId());
        version.setWorkflowCode(workflow.getWorkflowCode());
        version.setWorkflowName(workflow.getWorkflowName());
        version.setDescription(workflow.getDescription());
        version.setSystemCode(workflow.getSystemCode());
        version.setDataDomain(workflow.getDataDomain());
        version.setAgentCode(workflow.getAgentCode());
        version.setDefaultModel(workflow.getDefaultModel());
        version.setVersionNo(maxVersion + 1);
        version.setSchemaJson(workflow.getSchemaJson());
        version.setStatus("PUBLISHED");
        version.setPublishedAt(LocalDateTime.now());
        version.setCreatedAt(LocalDateTime.now());
        workflowVersionMapper.insert(version);

        workflow.setStatus("PUBLISHED");
        workflow.setCurrentVersionNo(version.getVersionNo());
        workflow.setUpdatedAt(LocalDateTime.now());
        workflowDefinitionMapper.updateById(workflow);
        return toVersionResponse(version);
    }

    @Transactional(readOnly = true)
    public List<WorkflowVersionResponse> versions(Long workflowId) {
        return workflowVersionMapper.selectList(new LambdaQueryWrapper<WorkflowVersion>()
                        .eq(WorkflowVersion::getWorkflowId, workflowId)
                        .orderByDesc(WorkflowVersion::getVersionNo))
                .stream()
                .map(this::toVersionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkflowRuntimeConfigResponse resolvePublished(Long tenantId, String workflowCode, GatewayRequestContext context) {
        String normalizedWorkflowCode = normalizeCode(workflowCode);
        if (!StringUtils.hasText(normalizedWorkflowCode)) {
            throw new GatewayException(HttpStatus.BAD_REQUEST, "missing_workflow_code", "Missing workflow_code");
        }
        WorkflowDefinition workflow = workflowDefinitionMapper.selectOne(new LambdaQueryWrapper<WorkflowDefinition>()
                .eq(WorkflowDefinition::getTenantId, tenantId)
                .eq(WorkflowDefinition::getWorkflowCode, normalizedWorkflowCode)
                .eq(WorkflowDefinition::getStatus, "PUBLISHED"));
        if (workflow == null) {
            throw new GatewayException(HttpStatus.NOT_FOUND, "workflow_not_found", "Workflow is not published");
        }
        requireWorkflowContext(workflow, context == null ? GatewayRequestContext.empty() : context);
        WorkflowVersion version = latestPublishedVersion(workflow.getId());
        return toRuntimeResponse(workflow, version);
    }

    public Long tenantIdOf(Long id) {
        return requireWorkflow(id).getTenantId();
    }

    private void apply(WorkflowDefinition workflow, WorkflowRequest request) {
        if (request.tenantId() != null) {
            workflow.setTenantId(request.tenantId());
        }
        workflow.setWorkflowCode(requiredCode(request.workflowCode(), "Workflow code is required"));
        workflow.setWorkflowName(requiredText(request.workflowName(), "Workflow name is required"));
        workflow.setDescription(trimToNull(request.description()));
        workflow.setSystemCode(normalizeCode(request.systemCode()));
        workflow.setDataDomain(normalizeCode(request.dataDomain()));
        workflow.setAgentCode(normalizeCode(request.agentCode()));
        workflow.setDefaultModel(trimToNull(request.defaultModel()));
        workflow.setSchemaJson(normalizeSchema(request.schemaJson()));
    }

    private WorkflowDefinition requireWorkflow(Long id) {
        WorkflowDefinition workflow = workflowDefinitionMapper.selectById(id);
        if (workflow == null) {
            throw new NotFoundException("Workflow not found");
        }
        return workflow;
    }

    private WorkflowVersion latestPublishedVersion(Long workflowId) {
        return workflowVersionMapper.selectList(new LambdaQueryWrapper<WorkflowVersion>()
                        .eq(WorkflowVersion::getWorkflowId, workflowId)
                        .eq(WorkflowVersion::getStatus, "PUBLISHED")
                        .orderByDesc(WorkflowVersion::getVersionNo))
                .stream()
                .findFirst()
                .orElse(null);
    }

    private void requireWorkflowContext(WorkflowDefinition workflow, GatewayRequestContext context) {
        if (StringUtils.hasText(workflow.getSystemCode()) && !"*".equals(workflow.getSystemCode())) {
            String actualSystemCode = normalizeCode(context.systemCode());
            if (!workflow.getSystemCode().equals(actualSystemCode)) {
                throw new GatewayException(HttpStatus.FORBIDDEN, "workflow_context_not_allowed", "Workflow is not allowed for this system_code");
            }
        }
        if (StringUtils.hasText(workflow.getDataDomain()) && !"*".equals(workflow.getDataDomain())) {
            String actualDataDomain = normalizeCode(context.dataDomain());
            if (!workflow.getDataDomain().equals(actualDataDomain)) {
                throw new GatewayException(HttpStatus.FORBIDDEN, "workflow_context_not_allowed", "Workflow is not allowed for this data_domain");
            }
        }
    }

    private void assertTenantExists(Long tenantId) {
        if (tenantId == null || tenantMapper.selectById(tenantId) == null) {
            throw new BusinessException("Tenant not found");
        }
    }

    private void assertWorkflowCodeAvailable(Long tenantId, String workflowCode, Long excludedId) {
        LambdaQueryWrapper<WorkflowDefinition> wrapper = new LambdaQueryWrapper<WorkflowDefinition>()
                .eq(WorkflowDefinition::getTenantId, tenantId)
                .eq(WorkflowDefinition::getWorkflowCode, workflowCode);
        if (excludedId != null) {
            wrapper.ne(WorkflowDefinition::getId, excludedId);
        }
        if (workflowDefinitionMapper.selectCount(wrapper) > 0) {
            throw new BusinessException("Workflow code already exists");
        }
    }

    private String normalizeSchema(String schemaJson) {
        String value = StringUtils.hasText(schemaJson) ? schemaJson.trim() : DEFAULT_SCHEMA;
        try {
            return objectMapper.writeValueAsString(objectMapper.readTree(value));
        } catch (Exception ex) {
            throw new BusinessException("Workflow schema_json is not valid JSON");
        }
    }

    private String normalizeStatus(String status, String fallback) {
        String value = StringUtils.hasText(status) ? status.trim().toUpperCase() : fallback;
        if (!List.of("DRAFT", "PUBLISHED", "DISABLED").contains(value)) {
            throw new BusinessException("Invalid workflow status");
        }
        return value;
    }

    private String normalizeCode(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase() : null;
    }

    private String requiredText(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessException(message);
        }
        return value.trim();
    }

    private String requiredCode(String value, String message) {
        String normalized = normalizeCode(value);
        if (!StringUtils.hasText(normalized)) {
            throw new BusinessException(message);
        }
        return normalized;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private WorkflowResponse toResponse(WorkflowDefinition workflow) {
        return new WorkflowResponse(
                workflow.getId(),
                workflow.getTenantId(),
                workflow.getWorkflowCode(),
                workflow.getWorkflowName(),
                workflow.getDescription(),
                workflow.getSystemCode(),
                workflow.getDataDomain(),
                workflow.getAgentCode(),
                workflow.getDefaultModel(),
                workflow.getSchemaJson(),
                workflow.getStatus(),
                workflow.getCurrentVersionNo(),
                workflow.getCreatedAt(),
                workflow.getUpdatedAt()
        );
    }

    private WorkflowVersionResponse toVersionResponse(WorkflowVersion version) {
        return new WorkflowVersionResponse(
                version.getId(),
                version.getTenantId(),
                version.getWorkflowId(),
                version.getWorkflowCode(),
                version.getWorkflowName(),
                version.getDescription(),
                version.getSystemCode(),
                version.getDataDomain(),
                version.getAgentCode(),
                version.getDefaultModel(),
                version.getVersionNo(),
                version.getSchemaJson(),
                version.getStatus(),
                version.getPublishedAt(),
                version.getCreatedAt()
        );
    }

    private WorkflowRuntimeConfigResponse toRuntimeResponse(WorkflowDefinition workflow, WorkflowVersion version) {
        return new WorkflowRuntimeConfigResponse(
                workflow.getTenantId(),
                workflow.getWorkflowCode(),
                workflow.getWorkflowName(),
                workflow.getDescription(),
                workflow.getSystemCode(),
                workflow.getDataDomain(),
                workflow.getAgentCode(),
                workflow.getDefaultModel(),
                version == null ? workflow.getCurrentVersionNo() : version.getVersionNo(),
                version == null ? workflow.getSchemaJson() : version.getSchemaJson(),
                workflow.getStatus(),
                version == null ? null : version.getPublishedAt()
        );
    }
}
