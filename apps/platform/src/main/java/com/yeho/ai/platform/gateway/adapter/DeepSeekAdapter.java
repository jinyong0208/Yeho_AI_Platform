package com.yeho.ai.platform.gateway.adapter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class DeepSeekAdapter extends OpenAiCompatibleAdapter {
    public DeepSeekAdapter(ObjectMapper objectMapper) {
        super(objectMapper);
    }

    @Override
    public boolean supports(String providerCode) {
        return "DEEPSEEK".equalsIgnoreCase(providerCode);
    }
}
