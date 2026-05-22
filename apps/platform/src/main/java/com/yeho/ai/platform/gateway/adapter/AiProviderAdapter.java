package com.yeho.ai.platform.gateway.adapter;

public interface AiProviderAdapter {
    boolean supports(String providerCode);

    AdapterChatResponse chat(AdapterChatRequest request);
}
