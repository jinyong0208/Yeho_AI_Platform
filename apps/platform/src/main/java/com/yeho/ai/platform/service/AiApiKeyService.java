package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.TenantApiKeyMapper;
import com.yeho.ai.platform.security.ApiKeyHashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AiApiKeyService {
    private final TenantApiKeyMapper tenantApiKeyMapper;
    private final ApiKeyHashService apiKeyHashService;

    @Transactional
    public TenantApiKey authenticate(String authorizationHeader) {
        String apiKey = extractBearerToken(authorizationHeader);
        String apiKeyHash = apiKeyHashService.hash(apiKey);
        TenantApiKey tenantApiKey = tenantApiKeyMapper.selectOne(new LambdaQueryWrapper<TenantApiKey>()
            .eq(TenantApiKey::getApiKeyHash, apiKeyHash)
            .eq(TenantApiKey::getStatus, "ACTIVE"));
        if (tenantApiKey == null) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "invalid_api_key", "Invalid API key");
        }
        if (tenantApiKey.getExpiredAt() != null && tenantApiKey.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "api_key_expired", "API key has expired");
        }

        tenantApiKey.setLastUsedAt(LocalDateTime.now());
        tenantApiKeyMapper.updateById(tenantApiKey);
        return tenantApiKey;
    }

    private String extractBearerToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "missing_api_key", "Missing API key");
        }
        String apiKey = authorizationHeader.substring(7).trim();
        if (!StringUtils.hasText(apiKey)) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "missing_api_key", "Missing API key");
        }
        return apiKey;
    }
}
