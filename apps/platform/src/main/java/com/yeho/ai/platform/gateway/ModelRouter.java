package com.yeho.ai.platform.gateway;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.gateway.adapter.AiProviderAdapter;
import com.yeho.ai.platform.mapper.AiModelMapper;
import com.yeho.ai.platform.mapper.AiProviderMapper;
import com.yeho.ai.platform.security.SecretCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ModelRouter {
    private final AiModelMapper aiModelMapper;
    private final AiProviderMapper aiProviderMapper;
    private final SecretCryptoService secretCryptoService;
    private final List<AiProviderAdapter> adapters;

    public ModelRoute route(String modelCode) {
        AiModel model = aiModelMapper.selectOne(new LambdaQueryWrapper<AiModel>()
            .eq(AiModel::getModelCode, modelCode)
            .eq(AiModel::getStatus, "ACTIVE"));
        if (model == null) {
            throw new GatewayException(HttpStatus.NOT_FOUND, "model_not_found", "Model is not available");
        }
        AiProvider provider = aiProviderMapper.selectById(model.getProviderId());
        if (provider == null || !"ACTIVE".equals(provider.getStatus())) {
            throw new GatewayException(HttpStatus.NOT_FOUND, "provider_not_found", "Provider is not available");
        }
        AiProviderAdapter adapter = adapters.stream()
            .filter(item -> item.supports(provider.getProviderCode()))
            .findFirst()
            .orElseThrow(() -> new GatewayException(
                HttpStatus.BAD_REQUEST,
                "provider_not_supported",
                "Provider is not supported yet"
            ));
        return new ModelRoute(provider, model, adapter, secretCryptoService.decrypt(provider.getApiKeyEncrypted()));
    }
}
