package com.yeho.ai.platform.gateway.adapter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class QwenAdapter extends OpenAiCompatibleAdapter {
    public QwenAdapter(ObjectMapper objectMapper) {
        super(objectMapper);
    }

    @Override
    public boolean supports(String providerCode) {
        return "QWEN".equalsIgnoreCase(providerCode);
    }
}
