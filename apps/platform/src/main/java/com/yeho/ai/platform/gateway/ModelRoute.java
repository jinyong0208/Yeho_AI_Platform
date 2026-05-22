package com.yeho.ai.platform.gateway;

import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.gateway.adapter.AiProviderAdapter;

public record ModelRoute(
    AiProvider provider,
    AiModel model,
    AiProviderAdapter adapter,
    String decryptedApiKey
) {
}
