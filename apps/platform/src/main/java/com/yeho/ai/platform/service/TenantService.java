package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.tenant.TenantCreateRequest;
import com.yeho.ai.platform.dto.tenant.TenantResponse;
import com.yeho.ai.platform.dto.tenant.TenantUpdateRequest;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.mapper.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantService {
    private final TenantMapper tenantMapper;

    @Transactional
    public TenantResponse create(TenantCreateRequest request) {
        long count = tenantMapper.selectCount(new LambdaQueryWrapper<Tenant>()
            .eq(Tenant::getTenantCode, request.getTenantCode()));
        if (count > 0) {
            throw new BusinessException("Tenant code already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        Tenant tenant = new Tenant();
        tenant.setTenantCode(request.getTenantCode());
        tenant.setTenantName(request.getTenantName());
        tenant.setStatus("ACTIVE");
        tenant.setContactName(request.getContactName());
        tenant.setContactPhone(request.getContactPhone());
        tenant.setContactEmail(request.getContactEmail());
        tenant.setCreatedAt(now);
        tenant.setUpdatedAt(now);
        tenantMapper.insert(tenant);
        return toResponse(tenant);
    }

    public List<TenantResponse> list() {
        return tenantMapper.selectList(new LambdaQueryWrapper<Tenant>()
                .ne(Tenant::getStatus, "DELETED")
                .orderByDesc(Tenant::getCreatedAt))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public TenantResponse get(Long id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public TenantResponse update(Long id, TenantUpdateRequest request) {
        Tenant tenant = findActive(id);
        tenant.setTenantName(request.getTenantName());
        tenant.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : tenant.getStatus());
        tenant.setContactName(request.getContactName());
        tenant.setContactPhone(request.getContactPhone());
        tenant.setContactEmail(request.getContactEmail());
        tenant.setUpdatedAt(LocalDateTime.now());
        tenantMapper.updateById(tenant);
        return toResponse(tenant);
    }

    @Transactional
    public void delete(Long id) {
        Tenant tenant = findActive(id);
        tenant.setStatus("DELETED");
        tenant.setUpdatedAt(LocalDateTime.now());
        tenantMapper.updateById(tenant);
    }

    private Tenant findActive(Long id) {
        Tenant tenant = tenantMapper.selectById(id);
        if (tenant == null || "DELETED".equals(tenant.getStatus())) {
            throw new NotFoundException("Tenant not found");
        }
        return tenant;
    }

    private TenantResponse toResponse(Tenant tenant) {
        return new TenantResponse(
            tenant.getId(),
            tenant.getTenantCode(),
            tenant.getTenantName(),
            tenant.getStatus(),
            tenant.getContactName(),
            tenant.getContactPhone(),
            tenant.getContactEmail(),
            tenant.getCreatedAt(),
            tenant.getUpdatedAt()
        );
    }
}
