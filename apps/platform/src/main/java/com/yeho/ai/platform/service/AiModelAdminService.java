package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.gateway.ModelCreateRequest;
import com.yeho.ai.platform.dto.gateway.ModelResponse;
import com.yeho.ai.platform.dto.gateway.ModelUpdateRequest;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.mapper.AiModelMapper;
import com.yeho.ai.platform.mapper.AiProviderMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiModelAdminService {
    private final AiModelMapper aiModelMapper;
    private final AiProviderMapper aiProviderMapper;

    @Transactional
    public ModelResponse create(ModelCreateRequest request) {
        AiProvider provider = requireProvider(request.getProviderId());
        LocalDateTime now = LocalDateTime.now();
        AiModel model = new AiModel();
        model.setProviderId(request.getProviderId());
        model.setModelCode(request.getModelCode());
        model.setDisplayName(request.getDisplayName());
        model.setInputPrice(nullSafe(request.getInputPrice()));
        model.setOutputPrice(nullSafe(request.getOutputPrice()));
        model.setInputCreditRate(nullSafe(request.getInputCreditRate()));
        model.setOutputCreditRate(nullSafe(request.getOutputCreditRate()));
        model.setBillingMultiplier(request.getBillingMultiplier() == null ? BigDecimal.ONE : request.getBillingMultiplier());
        model.setSupportStream(Boolean.TRUE.equals(request.getSupportStream()));
        model.setSupportToolCall(Boolean.TRUE.equals(request.getSupportToolCall()));
        model.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : "ACTIVE");
        model.setCreatedAt(now);
        model.setUpdatedAt(now);
        aiModelMapper.insert(model);
        return toResponse(model, provider.getProviderCode());
    }

    @Transactional(readOnly = true)
    public List<ModelResponse> list() {
        List<AiProvider> providers = aiProviderMapper.selectList(new LambdaQueryWrapper<>());
        Map<Long, String> providerCodeMap = providers.stream()
            .collect(Collectors.toMap(AiProvider::getId, AiProvider::getProviderCode));
        return aiModelMapper.selectList(new LambdaQueryWrapper<AiModel>()
                .orderByAsc(AiModel::getModelCode))
            .stream()
            .map(model -> toResponse(model, providerCodeMap.get(model.getProviderId())))
            .toList();
    }

    @Transactional(readOnly = true)
    public ModelResponse get(Long id) {
        AiModel model = requireModel(id);
        AiProvider provider = requireProvider(model.getProviderId());
        return toResponse(model, provider.getProviderCode());
    }

    @Transactional
    public ModelResponse update(Long id, ModelUpdateRequest request) {
        AiModel model = requireModel(id);
        AiProvider provider = request.getProviderId() == null
            ? requireProvider(model.getProviderId())
            : requireProvider(request.getProviderId());
        if (request.getProviderId() != null) {
            model.setProviderId(request.getProviderId());
        }
        if (StringUtils.hasText(request.getDisplayName())) {
            model.setDisplayName(request.getDisplayName());
        }
        if (request.getInputPrice() != null) {
            model.setInputPrice(request.getInputPrice());
        }
        if (request.getOutputPrice() != null) {
            model.setOutputPrice(request.getOutputPrice());
        }
        if (request.getInputCreditRate() != null) {
            model.setInputCreditRate(request.getInputCreditRate());
        }
        if (request.getOutputCreditRate() != null) {
            model.setOutputCreditRate(request.getOutputCreditRate());
        }
        if (request.getBillingMultiplier() != null) {
            model.setBillingMultiplier(request.getBillingMultiplier());
        }
        if (request.getSupportStream() != null) {
            model.setSupportStream(request.getSupportStream());
        }
        if (request.getSupportToolCall() != null) {
            model.setSupportToolCall(request.getSupportToolCall());
        }
        if (StringUtils.hasText(request.getStatus())) {
            model.setStatus(request.getStatus());
        }
        model.setUpdatedAt(LocalDateTime.now());
        aiModelMapper.updateById(model);
        return toResponse(model, provider.getProviderCode());
    }

    @Transactional
    public void disable(Long id) {
        AiModel model = requireModel(id);
        model.setStatus("DISABLED");
        model.setUpdatedAt(LocalDateTime.now());
        aiModelMapper.updateById(model);
    }

    private AiModel requireModel(Long id) {
        AiModel model = aiModelMapper.selectById(id);
        if (model == null) {
            throw new NotFoundException("Model not found");
        }
        return model;
    }

    private AiProvider requireProvider(Long id) {
        AiProvider provider = aiProviderMapper.selectById(id);
        if (provider == null) {
            throw new NotFoundException("Provider not found");
        }
        return provider;
    }

    private ModelResponse toResponse(AiModel model, String providerCode) {
        return new ModelResponse(
            model.getId(),
            model.getProviderId(),
            providerCode,
            model.getModelCode(),
            model.getDisplayName(),
            model.getInputPrice(),
            model.getOutputPrice(),
            model.getInputCreditRate(),
            model.getOutputCreditRate(),
            model.getBillingMultiplier(),
            model.getSupportStream(),
            model.getSupportToolCall(),
            model.getStatus(),
            model.getCreatedAt(),
            model.getUpdatedAt()
        );
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
