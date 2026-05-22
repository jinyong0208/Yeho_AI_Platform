package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.gateway.ProviderCreateRequest;
import com.yeho.ai.platform.dto.gateway.ProviderResponse;
import com.yeho.ai.platform.dto.gateway.ProviderUpdateRequest;
import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.mapper.AiProviderMapper;
import com.yeho.ai.platform.security.SecretCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiProviderAdminService {
    private final AiProviderMapper aiProviderMapper;
    private final SecretCryptoService secretCryptoService;

    @Transactional
    public ProviderResponse create(ProviderCreateRequest request) {
        LocalDateTime now = LocalDateTime.now();
        AiProvider provider = new AiProvider();
        provider.setProviderCode(request.getProviderCode().trim().toUpperCase());
        provider.setProviderName(request.getProviderName());
        provider.setBaseUrl(request.getBaseUrl());
        provider.setApiKeyEncrypted(secretCryptoService.encrypt(request.getApiKey()));
        provider.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : "ACTIVE");
        provider.setCreatedAt(now);
        provider.setUpdatedAt(now);
        aiProviderMapper.insert(provider);
        return toResponse(provider);
    }

    @Transactional(readOnly = true)
    public List<ProviderResponse> list() {
        return aiProviderMapper.selectList(new LambdaQueryWrapper<AiProvider>()
                .orderByAsc(AiProvider::getProviderCode))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public ProviderResponse get(Long id) {
        return toResponse(requireProvider(id));
    }

    @Transactional
    public ProviderResponse update(Long id, ProviderUpdateRequest request) {
        AiProvider provider = requireProvider(id);
        if (StringUtils.hasText(request.getProviderName())) {
            provider.setProviderName(request.getProviderName());
        }
        if (StringUtils.hasText(request.getBaseUrl())) {
            provider.setBaseUrl(request.getBaseUrl());
        }
        if (request.getApiKey() != null) {
            provider.setApiKeyEncrypted(secretCryptoService.encrypt(request.getApiKey()));
        }
        if (StringUtils.hasText(request.getStatus())) {
            provider.setStatus(request.getStatus());
        }
        provider.setUpdatedAt(LocalDateTime.now());
        aiProviderMapper.updateById(provider);
        return toResponse(provider);
    }

    @Transactional
    public void disable(Long id) {
        AiProvider provider = requireProvider(id);
        provider.setStatus("DISABLED");
        provider.setUpdatedAt(LocalDateTime.now());
        aiProviderMapper.updateById(provider);
    }

    private AiProvider requireProvider(Long id) {
        AiProvider provider = aiProviderMapper.selectById(id);
        if (provider == null) {
            throw new NotFoundException("Provider not found");
        }
        return provider;
    }

    private ProviderResponse toResponse(AiProvider provider) {
        return new ProviderResponse(
            provider.getId(),
            provider.getProviderCode(),
            provider.getProviderName(),
            provider.getBaseUrl(),
            provider.getStatus(),
            StringUtils.hasText(provider.getApiKeyEncrypted()),
            provider.getCreatedAt(),
            provider.getUpdatedAt()
        );
    }
}
