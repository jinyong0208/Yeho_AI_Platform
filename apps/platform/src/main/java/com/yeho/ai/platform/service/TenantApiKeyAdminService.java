package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.gateway.ApiKeyCreateRequest;
import com.yeho.ai.platform.dto.gateway.ApiKeyCreateResponse;
import com.yeho.ai.platform.dto.gateway.ApiKeyResponse;
import com.yeho.ai.platform.dto.gateway.ApiKeyScopeUpdateRequest;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.mapper.TenantApiKeyMapper;
import com.yeho.ai.platform.mapper.TenantMapper;
import com.yeho.ai.platform.security.ApiKeyHashService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantApiKeyAdminService {
    private final TenantApiKeyMapper tenantApiKeyMapper;
    private final TenantMapper tenantMapper;
    private final ApiKeyHashService apiKeyHashService;
    private final ApiKeyScopeService apiKeyScopeService;

    @Transactional
    public ApiKeyCreateResponse create(Long tenantId, ApiKeyCreateRequest request) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            throw new NotFoundException("Tenant not found");
        }

        String plainKey = apiKeyHashService.generatePlainKey();
        LocalDateTime now = LocalDateTime.now();
        TenantApiKey apiKey = new TenantApiKey();
        apiKey.setTenantId(tenantId);
        apiKey.setApiKeyHash(apiKeyHashService.hash(plainKey));
        apiKey.setApiKeyPrefix(apiKeyHashService.prefix(plainKey));
        apiKey.setName(request.getName());
        apiKey.setScopes(apiKeyScopeService.normalizeScopes(request.getScopes()));
        apiKey.setStatus("ACTIVE");
        apiKey.setExpiredAt(request.getExpiredAt());
        apiKey.setCreatedAt(now);
        tenantApiKeyMapper.insert(apiKey);
        return new ApiKeyCreateResponse(
            apiKey.getId(),
            apiKey.getTenantId(),
            plainKey,
            apiKey.getApiKeyPrefix(),
            apiKey.getName(),
            apiKeyScopeService.parseScopes(apiKey.getScopes()),
            apiKey.getStatus(),
            apiKey.getExpiredAt(),
            apiKey.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> list(Long tenantId) {
        return tenantApiKeyMapper.selectList(new LambdaQueryWrapper<TenantApiKey>()
                .eq(TenantApiKey::getTenantId, tenantId)
                .orderByDesc(TenantApiKey::getCreatedAt))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public void revoke(Long tenantId, Long id) {
        TenantApiKey apiKey = tenantApiKeyMapper.selectOne(new LambdaQueryWrapper<TenantApiKey>()
            .eq(TenantApiKey::getTenantId, tenantId)
            .eq(TenantApiKey::getId, id));
        if (apiKey == null) {
            throw new NotFoundException("API key not found");
        }
        apiKey.setStatus("REVOKED");
        tenantApiKeyMapper.updateById(apiKey);
    }

    @Transactional
    public ApiKeyResponse updateScopes(Long tenantId, Long id, ApiKeyScopeUpdateRequest request) {
        TenantApiKey apiKey = tenantApiKeyMapper.selectOne(new LambdaQueryWrapper<TenantApiKey>()
            .eq(TenantApiKey::getTenantId, tenantId)
            .eq(TenantApiKey::getId, id));
        if (apiKey == null) {
            throw new NotFoundException("API key not found");
        }
        apiKey.setScopes(apiKeyScopeService.normalizeScopes(request.getScopes()));
        tenantApiKeyMapper.updateById(apiKey);
        return toResponse(apiKey);
    }

    private ApiKeyResponse toResponse(TenantApiKey apiKey) {
        return new ApiKeyResponse(
            apiKey.getId(),
            apiKey.getTenantId(),
            apiKey.getApiKeyPrefix(),
            apiKey.getName(),
            apiKeyScopeService.parseScopes(apiKey.getScopes()),
            apiKey.getStatus(),
            apiKey.getExpiredAt(),
            apiKey.getCreatedAt(),
            apiKey.getLastUsedAt()
        );
    }
}
