package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.system.BusinessSystemRequest;
import com.yeho.ai.platform.dto.system.BusinessSystemResponse;
import com.yeho.ai.platform.entity.BusinessSystem;
import com.yeho.ai.platform.mapper.BusinessSystemMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BusinessSystemService {
    private final BusinessSystemMapper businessSystemMapper;

    @Transactional(readOnly = true)
    public List<BusinessSystemResponse> list(Long tenantId) {
        return businessSystemMapper.selectList(new LambdaQueryWrapper<BusinessSystem>()
                .eq(BusinessSystem::getTenantId, tenantId)
                .orderByAsc(BusinessSystem::getSystemCode))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public BusinessSystemResponse create(Long tenantId, BusinessSystemRequest request) {
        BusinessSystem system = new BusinessSystem();
        system.setTenantId(tenantId);
        apply(system, request);
        system.setStatus(normalizeStatus(request.getStatus(), "ACTIVE"));
        system.setCreatedAt(LocalDateTime.now());
        system.setUpdatedAt(LocalDateTime.now());
        businessSystemMapper.insert(system);
        return toResponse(system);
    }

    @Transactional
    public BusinessSystemResponse update(Long tenantId, Long id, BusinessSystemRequest request) {
        BusinessSystem system = requireSystem(tenantId, id);
        apply(system, request);
        if (StringUtils.hasText(request.getStatus())) {
            system.setStatus(normalizeStatus(request.getStatus(), system.getStatus()));
        }
        system.setUpdatedAt(LocalDateTime.now());
        businessSystemMapper.updateById(system);
        return toResponse(system);
    }

    @Transactional
    public BusinessSystemResponse disable(Long tenantId, Long id) {
        BusinessSystem system = requireSystem(tenantId, id);
        system.setStatus("DISABLED");
        system.setUpdatedAt(LocalDateTime.now());
        businessSystemMapper.updateById(system);
        return toResponse(system);
    }

    private void apply(BusinessSystem system, BusinessSystemRequest request) {
        system.setSystemCode(normalizeCode(request.getSystemCode()));
        system.setSystemName(request.getSystemName().trim());
        system.setDescription(request.getDescription());
    }

    private BusinessSystem requireSystem(Long tenantId, Long id) {
        BusinessSystem system = businessSystemMapper.selectOne(new LambdaQueryWrapper<BusinessSystem>()
            .eq(BusinessSystem::getTenantId, tenantId)
            .eq(BusinessSystem::getId, id));
        if (system == null) {
            throw new NotFoundException("Business system not found");
        }
        return system;
    }

    private String normalizeCode(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    private String normalizeStatus(String status, String fallback) {
        return StringUtils.hasText(status) ? status.trim().toUpperCase() : fallback;
    }

    private BusinessSystemResponse toResponse(BusinessSystem system) {
        return new BusinessSystemResponse(
            system.getId(),
            system.getTenantId(),
            system.getSystemCode(),
            system.getSystemName(),
            system.getDescription(),
            system.getStatus(),
            system.getCreatedAt(),
            system.getUpdatedAt()
        );
    }
}
