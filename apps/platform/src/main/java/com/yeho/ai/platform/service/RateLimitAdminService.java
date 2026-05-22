package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.gateway.RateLimitResponse;
import com.yeho.ai.platform.dto.gateway.RateLimitUpsertRequest;
import com.yeho.ai.platform.entity.ApiKeyRateLimit;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.entity.TenantRateLimit;
import com.yeho.ai.platform.mapper.ApiKeyRateLimitMapper;
import com.yeho.ai.platform.mapper.TenantApiKeyMapper;
import com.yeho.ai.platform.mapper.TenantMapper;
import com.yeho.ai.platform.mapper.TenantRateLimitMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RateLimitAdminService {
    private final TenantMapper tenantMapper;
    private final TenantApiKeyMapper tenantApiKeyMapper;
    private final TenantRateLimitMapper tenantRateLimitMapper;
    private final ApiKeyRateLimitMapper apiKeyRateLimitMapper;

    @Transactional(readOnly = true)
    public RateLimitResponse getTenantLimit(Long tenantId) {
        TenantRateLimit limit = tenantRateLimitMapper.selectOne(new LambdaQueryWrapper<TenantRateLimit>()
            .eq(TenantRateLimit::getTenantId, tenantId));
        return limit == null ? null : tenantResponse(limit);
    }

    @Transactional
    public RateLimitResponse upsertTenantLimit(Long tenantId, RateLimitUpsertRequest request) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            throw new NotFoundException("Tenant not found");
        }
        TenantRateLimit limit = tenantRateLimitMapper.selectOne(new LambdaQueryWrapper<TenantRateLimit>()
            .eq(TenantRateLimit::getTenantId, tenantId));
        LocalDateTime now = LocalDateTime.now();
        if (limit == null) {
            limit = new TenantRateLimit();
            limit.setTenantId(tenantId);
            limit.setCreatedAt(now);
        }
        apply(limit, request, now);
        if (limit.getId() == null) {
            tenantRateLimitMapper.insert(limit);
        } else {
            tenantRateLimitMapper.updateById(limit);
        }
        return tenantResponse(limit);
    }

    @Transactional(readOnly = true)
    public RateLimitResponse getApiKeyLimit(Long tenantId, Long apiKeyId) {
        ApiKeyRateLimit limit = apiKeyRateLimitMapper.selectOne(new LambdaQueryWrapper<ApiKeyRateLimit>()
            .eq(ApiKeyRateLimit::getTenantId, tenantId)
            .eq(ApiKeyRateLimit::getApiKeyId, apiKeyId));
        return limit == null ? null : apiKeyResponse(limit);
    }

    @Transactional
    public RateLimitResponse upsertApiKeyLimit(Long tenantId, Long apiKeyId, RateLimitUpsertRequest request) {
        TenantApiKey apiKey = tenantApiKeyMapper.selectOne(new LambdaQueryWrapper<TenantApiKey>()
            .eq(TenantApiKey::getTenantId, tenantId)
            .eq(TenantApiKey::getId, apiKeyId));
        if (apiKey == null) {
            throw new NotFoundException("API key not found");
        }
        ApiKeyRateLimit limit = apiKeyRateLimitMapper.selectOne(new LambdaQueryWrapper<ApiKeyRateLimit>()
            .eq(ApiKeyRateLimit::getApiKeyId, apiKeyId));
        LocalDateTime now = LocalDateTime.now();
        if (limit == null) {
            limit = new ApiKeyRateLimit();
            limit.setTenantId(tenantId);
            limit.setApiKeyId(apiKeyId);
            limit.setCreatedAt(now);
        }
        apply(limit, request, now);
        if (limit.getId() == null) {
            apiKeyRateLimitMapper.insert(limit);
        } else {
            apiKeyRateLimitMapper.updateById(limit);
        }
        return apiKeyResponse(limit);
    }

    private void apply(TenantRateLimit limit, RateLimitUpsertRequest request, LocalDateTime now) {
        limit.setRpmLimit(request.getRpmLimit());
        limit.setTpmLimit(request.getTpmLimit());
        limit.setDailyCreditsLimit(request.getDailyCreditsLimit());
        limit.setMaxConcurrent(request.getMaxConcurrent());
        limit.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : "ACTIVE");
        limit.setUpdatedAt(now);
    }

    private void apply(ApiKeyRateLimit limit, RateLimitUpsertRequest request, LocalDateTime now) {
        limit.setRpmLimit(request.getRpmLimit());
        limit.setTpmLimit(request.getTpmLimit());
        limit.setDailyCreditsLimit(request.getDailyCreditsLimit());
        limit.setMaxConcurrent(request.getMaxConcurrent());
        limit.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : "ACTIVE");
        limit.setUpdatedAt(now);
    }

    private RateLimitResponse tenantResponse(TenantRateLimit limit) {
        return new RateLimitResponse(
            limit.getId(),
            limit.getTenantId(),
            null,
            limit.getRpmLimit(),
            limit.getTpmLimit(),
            limit.getDailyCreditsLimit(),
            limit.getMaxConcurrent(),
            limit.getStatus(),
            limit.getCreatedAt(),
            limit.getUpdatedAt()
        );
    }

    private RateLimitResponse apiKeyResponse(ApiKeyRateLimit limit) {
        return new RateLimitResponse(
            limit.getId(),
            limit.getTenantId(),
            limit.getApiKeyId(),
            limit.getRpmLimit(),
            limit.getTpmLimit(),
            limit.getDailyCreditsLimit(),
            limit.getMaxConcurrent(),
            limit.getStatus(),
            limit.getCreatedAt(),
            limit.getUpdatedAt()
        );
    }
}
