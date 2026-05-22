package com.yeho.ai.platform.gateway.adapter;

public interface AiProviderAdapter {
    boolean supports(String providerCode);

    AdapterChatResponse chat(AdapterChatRequest request);

    default void streamChat(AdapterChatRequest request, AdapterStreamConsumer consumer) {
        try {
            AdapterChatResponse response = chat(request);
            consumer.accept(new AdapterStreamChunk(
                response.content(),
                response.finishReason(),
                response.inputTokens(),
                response.outputTokens(),
                response.totalTokens()
            ));
        } catch (Exception ex) {
            if (ex instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new IllegalStateException("Adapter stream failed", ex);
        }
    }
}
