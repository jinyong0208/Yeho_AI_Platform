package com.yeho.ai.platform.gateway.adapter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class OpenAiAdapter extends OpenAiCompatibleAdapter {
    private static final Set<String> SUPPORTED = Set.of("OPENAI", "VLLM", "OLLAMA");

    public OpenAiAdapter(ObjectMapper objectMapper) {
        super(objectMapper);
    }

    @Override
    public boolean supports(String providerCode) {
        return SUPPORTED.contains(providerCode.toUpperCase());
    }
}
