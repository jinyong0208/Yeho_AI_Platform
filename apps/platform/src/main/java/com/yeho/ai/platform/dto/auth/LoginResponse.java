package com.yeho.ai.platform.dto.auth;

import java.util.List;

public record LoginResponse(
    String tokenType,
    String accessToken,
    Long expiresInSeconds,
    Long tenantId,
    String tenantCode,
    String tenantName,
    Long userId,
    String username,
    List<String> roles
) {
}
