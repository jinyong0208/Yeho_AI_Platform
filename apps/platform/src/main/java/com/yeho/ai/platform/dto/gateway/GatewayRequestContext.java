package com.yeho.ai.platform.dto.gateway;

import org.springframework.util.StringUtils;

public record GatewayRequestContext(
    String systemCode,
    String dataDomain,
    String agentCode
) {
    public static GatewayRequestContext empty() {
        return new GatewayRequestContext(null, null, null);
    }

    public static GatewayRequestContext of(String systemCode, String dataDomain, String agentCode) {
        return new GatewayRequestContext(normalize(systemCode), normalize(dataDomain), normalize(agentCode));
    }

    private static String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
