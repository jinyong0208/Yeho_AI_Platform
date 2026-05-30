package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.gateway.ModelPriceVersionCreateRequest;
import com.yeho.ai.platform.dto.gateway.ModelPriceVersionResponse;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.AiModelPriceVersion;
import com.yeho.ai.platform.mapper.AiModelMapper;
import com.yeho.ai.platform.mapper.AiModelPriceVersionMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiModelPriceVersionService {

    private final AiModelMapper aiModelMapper;
    private final AiModelPriceVersionMapper aiModelPriceVersionMapper;
    private final ModelPricingPolicyService modelPricingPolicyService;

    @Transactional(readOnly = true)
    public List<ModelPriceVersionResponse> list(Long modelId) {
        requireModel(modelId);
        return aiModelPriceVersionMapper.selectList(new LambdaQueryWrapper<AiModelPriceVersion>()
                .eq(AiModelPriceVersion::getModelId, modelId)
                .orderByDesc(AiModelPriceVersion::getVersionNo))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ModelPriceVersionResponse create(Long modelId, ModelPriceVersionCreateRequest request) {
        AiModel model = requireModel(modelId);
        model.setInputPrice(nullSafe(request.getInputPrice(), model.getInputPrice(), BigDecimal.ZERO));
        model.setOutputPrice(nullSafe(request.getOutputPrice(), model.getOutputPrice(), BigDecimal.ZERO));
        model.setInputCreditRate(nullSafe(request.getInputCreditRate(), model.getInputCreditRate(), BigDecimal.ZERO));
        model.setOutputCreditRate(nullSafe(request.getOutputCreditRate(), model.getOutputCreditRate(), BigDecimal.ZERO));
        model.setBillingMultiplier(nullSafe(request.getBillingMultiplier(), model.getBillingMultiplier(), BigDecimal.ONE));
        model.setUpdatedAt(LocalDateTime.now());
        modelPricingPolicyService.validate(model);
        aiModelMapper.updateById(model);
        return toResponse(createSnapshot(model, request.getRemark()));
    }

    @Transactional
    public AiModelPriceVersion createSnapshot(AiModel model, String remark) {
        AiModelPriceVersion version = new AiModelPriceVersion();
        version.setModelId(model.getId());
        version.setVersionNo(nextVersionNo(model.getId()));
        version.setInputPrice(nullSafe(model.getInputPrice(), BigDecimal.ZERO));
        version.setOutputPrice(nullSafe(model.getOutputPrice(), BigDecimal.ZERO));
        version.setInputCreditRate(nullSafe(model.getInputCreditRate(), BigDecimal.ZERO));
        version.setOutputCreditRate(nullSafe(model.getOutputCreditRate(), BigDecimal.ZERO));
        version.setBillingMultiplier(nullSafe(model.getBillingMultiplier(), BigDecimal.ONE));
        version.setEffectiveAt(LocalDateTime.now());
        version.setRemark(remark);
        version.setCreatedAt(LocalDateTime.now());
        version.setUpdatedAt(version.getCreatedAt());
        aiModelPriceVersionMapper.insert(version);

        model.setCurrentPriceVersionId(version.getId());
        model.setUpdatedAt(LocalDateTime.now());
        aiModelMapper.updateById(model);
        return version;
    }

    private AiModel requireModel(Long modelId) {
        AiModel model = aiModelMapper.selectById(modelId);
        if (model == null) {
            throw new NotFoundException("Model not found");
        }
        return model;
    }

    private int nextVersionNo(Long modelId) {
        AiModelPriceVersion latest = aiModelPriceVersionMapper.selectOne(new LambdaQueryWrapper<AiModelPriceVersion>()
            .eq(AiModelPriceVersion::getModelId, modelId)
            .orderByDesc(AiModelPriceVersion::getVersionNo)
            .last("LIMIT 1"));
        return latest == null || latest.getVersionNo() == null ? 1 : latest.getVersionNo() + 1;
    }

    private BigDecimal nullSafe(BigDecimal value, BigDecimal fallback, BigDecimal defaultValue) {
        if (value != null) {
            return value;
        }
        return nullSafe(fallback, defaultValue);
    }

    private BigDecimal nullSafe(BigDecimal value, BigDecimal defaultValue) {
        return value == null ? defaultValue : value;
    }

    private ModelPriceVersionResponse toResponse(AiModelPriceVersion version) {
        return new ModelPriceVersionResponse(
            version.getId(),
            version.getModelId(),
            version.getVersionNo(),
            version.getInputPrice(),
            version.getOutputPrice(),
            version.getInputCreditRate(),
            version.getOutputCreditRate(),
            version.getBillingMultiplier(),
            version.getEffectiveAt(),
            version.getRemark(),
            version.getCreatedAt(),
            version.getUpdatedAt()
        );
    }
}
