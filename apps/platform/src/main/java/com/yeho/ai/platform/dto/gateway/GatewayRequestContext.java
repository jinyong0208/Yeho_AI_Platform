package com.yeho.ai.platform.dto.gateway;

import org.springframework.util.StringUtils;

public record GatewayRequestContext(
    String systemCode,
    String dataDomain,
    String agentCode,
    String workflowCode
) {
    public static GatewayRequestContext empty() {
        return new GatewayRequestContext(null, null, null, null);
    }

    public static GatewayRequestContext of(String systemCode, String dataDomain, String agentCode) {
        return of(systemCode, dataDomain, agentCode, null);
    }

    public static GatewayRequestContext of(String systemCode, String dataDomain, String agentCode, String workflowCode) {
        return new GatewayRequestContext(
                normalize(systemCode),
                normalize(dataDomain),
                normalize(agentCode),
                normalize(workflowCode)
        );
    }

    private static String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
