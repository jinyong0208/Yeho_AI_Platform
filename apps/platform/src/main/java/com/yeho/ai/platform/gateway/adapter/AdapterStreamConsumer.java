package com.yeho.ai.platform.gateway.adapter;

@FunctionalInterface
public interface AdapterStreamConsumer {
    void accept(AdapterStreamChunk chunk) throws Exception;
}
