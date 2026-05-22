package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.gateway.ProviderApiKeyUpdateRequest;
import com.yeho.ai.platform.dto.gateway.ProviderCreateRequest;
import com.yeho.ai.platform.dto.gateway.ProviderResponse;
import com.yeho.ai.platform.dto.gateway.ProviderTestRequest;
import com.yeho.ai.platform.dto.gateway.ProviderTestResponse;
import com.yeho.ai.platform.dto.gateway.ProviderUpdateRequest;
import com.yeho.ai.platform.dto.openai.ChatMessage;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.gateway.adapter.AdapterChatRequest;
import com.yeho.ai.platform.gateway.adapter.AiProviderAdapter;
import com.yeho.ai.platform.mapper.AiModelMapper;
import com.yeho.ai.platform.mapper.AiProviderMapper;
import com.yeho.ai.platform.security.SecretCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiProviderAdminService {
    private final AiProviderMapper aiProviderMapper;
    private final AiModelMapper aiModelMapper;
    private final List<AiProviderAdapter> providerAdapters;
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
        provider.setTimeoutMs(120000);
        provider.setRetryCount(0);
        provider.setCircuitFailureThreshold(5);
        provider.setCircuitCooldownSeconds(60);
        provider.setHealthStatus("UNKNOWN");
        provider.setConsecutiveFailures(0);
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
        if (request.getTimeoutMs() != null) {
            provider.setTimeoutMs(request.getTimeoutMs());
        }
        if (request.getRetryCount() != null) {
            provider.setRetryCount(request.getRetryCount());
        }
        if (request.getCircuitFailureThreshold() != null) {
            provider.setCircuitFailureThreshold(request.getCircuitFailureThreshold());
        }
        if (request.getCircuitCooldownSeconds() != null) {
            provider.setCircuitCooldownSeconds(request.getCircuitCooldownSeconds());
        }
        if (request.getFallbackModelCode() != null) {
            provider.setFallbackModelCode(StringUtils.hasText(request.getFallbackModelCode()) ? request.getFallbackModelCode() : null);
        }
        provider.setUpdatedAt(LocalDateTime.now());
        aiProviderMapper.updateById(provider);
        return toResponse(provider);
    }

    @Transactional
    public ProviderResponse updateApiKey(Long id, ProviderApiKeyUpdateRequest request) {
        AiProvider provider = requireProvider(id);
        provider.setApiKeyEncrypted(secretCryptoService.encrypt(request.getApiKey()));
        provider.setUpdatedAt(LocalDateTime.now());
        aiProviderMapper.updateById(provider);
        return toResponse(provider);
    }

    @Transactional(readOnly = true)
    public ProviderTestResponse testConnection(Long id, ProviderTestRequest request) {
        AiProvider provider = requireProvider(id);
        LocalDateTime testedAt = LocalDateTime.now();
        String modelCode = resolveTestModel(provider.getId(), request);

        if (!"ACTIVE".equalsIgnoreCase(provider.getStatus())) {
            return testResult(provider, modelCode, false, "provider_disabled", "Provider is not active", 0L, testedAt);
        }
        if (!StringUtils.hasText(provider.getApiKeyEncrypted())) {
            return testResult(provider, modelCode, false, "provider_api_key_missing", "Provider API key is missing", 0L, testedAt);
        }
        if (!StringUtils.hasText(modelCode)) {
            return testResult(provider, modelCode, false, "model_missing", "No active model is configured for this provider", 0L, testedAt);
        }

        AiProviderAdapter adapter = providerAdapters.stream()
            .filter(item -> item.supports(provider.getProviderCode()))
            .findFirst()
            .orElse(null);
        if (adapter == null) {
            return testResult(provider, modelCode, false, "provider_adapter_missing", "Provider adapter is not configured", 0L, testedAt);
        }

        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setRole("user");
        chatMessage.setContent(resolveTestMessage(request));

        long startedAt = System.nanoTime();
        try {
            adapter.chat(new AdapterChatRequest(
                provider.getBaseUrl(),
                secretCryptoService.decrypt(provider.getApiKeyEncrypted()),
                modelCode,
                List.of(chatMessage),
                BigDecimal.valueOf(0.1),
                8
            ));
            return testResult(provider, modelCode, true, "ok", "Provider connection succeeded", elapsedMs(startedAt), testedAt);
        } catch (GatewayException ex) {
            return testResult(provider, modelCode, false, ex.getCode(), ex.getMessage(), elapsedMs(startedAt), testedAt);
        } catch (RuntimeException ex) {
            return testResult(provider, modelCode, false, "provider_test_failed", "Provider connection failed", elapsedMs(startedAt), testedAt);
        }
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

    private String resolveTestModel(Long providerId, ProviderTestRequest request) {
        if (request != null && StringUtils.hasText(request.getModel())) {
            return request.getModel().trim();
        }
        AiModel model = aiModelMapper.selectList(new LambdaQueryWrapper<AiModel>()
                .eq(AiModel::getProviderId, providerId)
                .eq(AiModel::getStatus, "ACTIVE")
                .orderByAsc(AiModel::getModelCode)
                .last("limit 1"))
            .stream()
            .findFirst()
            .orElse(null);
        return model == null ? null : model.getModelCode();
    }

    private String resolveTestMessage(ProviderTestRequest request) {
        if (request != null && StringUtils.hasText(request.getMessage())) {
            return request.getMessage().trim();
        }
        return "ping";
    }

    private Long elapsedMs(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    private ProviderTestResponse testResult(
        AiProvider provider,
        String modelCode,
        boolean success,
        String code,
        String message,
        Long latencyMs,
        LocalDateTime testedAt
    ) {
        return new ProviderTestResponse(
            provider.getId(),
            provider.getProviderCode(),
            modelCode,
            success,
            code,
            message,
            latencyMs,
            testedAt
        );
    }

    private ProviderResponse toResponse(AiProvider provider) {
        return new ProviderResponse(
            provider.getId(),
            provider.getProviderCode(),
            provider.getProviderName(),
            provider.getBaseUrl(),
            provider.getStatus(),
            StringUtils.hasText(provider.getApiKeyEncrypted()),
            provider.getTimeoutMs(),
            provider.getRetryCount(),
            provider.getCircuitFailureThreshold(),
            provider.getCircuitCooldownSeconds(),
            provider.getFallbackModelCode(),
            provider.getHealthStatus(),
            provider.getConsecutiveFailures(),
            provider.getCircuitOpenUntil(),
            provider.getLastCheckedAt(),
            provider.getCreatedAt(),
            provider.getUpdatedAt()
        );
    }
}
