package com.yeho.ai.platform.dto.tenant;

import java.time.LocalDateTime;

public record TenantResponse(
    Long id,
    String tenantCode,
    String tenantName,
    String status,
    String contactName,
    String contactPhone,
    String contactEmail,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
