package com.yeho.ai.platform.dto.system;

import java.time.LocalDateTime;

public record BusinessSystemResponse(
    Long id,
    Long tenantId,
    String systemCode,
    String systemName,
    String description,
    String status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
