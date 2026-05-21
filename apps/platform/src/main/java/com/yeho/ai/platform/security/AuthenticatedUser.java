package com.yeho.ai.platform.security;

import java.util.List;

public record AuthenticatedUser(
    Long userId,
    Long tenantId,
    String username,
    List<String> roles
) {
}
