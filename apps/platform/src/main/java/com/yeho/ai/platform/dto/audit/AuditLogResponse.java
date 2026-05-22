package com.yeho.ai.platform.dto.audit;

import java.time.LocalDateTime;

public record AuditLogResponse(
    Long id,
    Long tenantId,
    Long userId,
    String username,
    String roles,
    String requestId,
    String action,
    String resourceType,
    String resourceId,
    String method,
    String path,
    String queryString,
    Integer statusCode,
    Boolean success,
    Long latencyMs,
    String ip,
    String userAgent,
    LocalDateTime createdAt
) {
}
