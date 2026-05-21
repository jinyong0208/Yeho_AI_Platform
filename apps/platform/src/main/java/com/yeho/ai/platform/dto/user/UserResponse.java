package com.yeho.ai.platform.dto.user;

import java.time.LocalDateTime;
import java.util.List;

public record UserResponse(
    Long id,
    Long tenantId,
    String username,
    String displayName,
    String email,
    String phone,
    String status,
    List<String> roles,
    LocalDateTime lastLoginAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
