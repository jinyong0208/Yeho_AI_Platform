package com.yeho.ai.platform.gateway.adapter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class ClaudeAdapter extends OpenAiCompatibleAdapter {
    public ClaudeAdapter(ObjectMapper objectMapper) {
        super(objectMapper);
    }

    @Override
    public boolean supports(String providerCode) {
        return "CLAUDE".equalsIgnoreCase(providerCode);
    }
}
