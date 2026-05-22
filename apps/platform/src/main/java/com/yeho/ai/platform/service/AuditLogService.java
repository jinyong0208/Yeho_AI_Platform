package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.dto.audit.AuditLogResponse;
import com.yeho.ai.platform.entity.SysAuditLog;
import com.yeho.ai.platform.mapper.SysAuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {
    private final SysAuditLogMapper sysAuditLogMapper;

    public void record(SysAuditLog log) {
        sysAuditLogMapper.insert(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> list(
        Long tenantId,
        Long userId,
        String action,
        String resourceType,
        Boolean success,
        Integer limit
    ) {
        int safeLimit = normalizeLimit(limit);
        LambdaQueryWrapper<SysAuditLog> wrapper = new LambdaQueryWrapper<SysAuditLog>()
            .orderByDesc(SysAuditLog::getCreatedAt)
            .last("LIMIT " + safeLimit);
        if (tenantId != null) {
            wrapper.eq(SysAuditLog::getTenantId, tenantId);
        }
        if (userId != null) {
            wrapper.eq(SysAuditLog::getUserId, userId);
        }
        if (StringUtils.hasText(action)) {
            wrapper.eq(SysAuditLog::getAction, action);
        }
        if (StringUtils.hasText(resourceType)) {
            wrapper.eq(SysAuditLog::getResourceType, resourceType);
        }
        if (success != null) {
            wrapper.eq(SysAuditLog::getSuccess, success);
        }
        return sysAuditLogMapper.selectList(wrapper).stream()
            .map(this::toResponse)
            .toList();
    }

    private AuditLogResponse toResponse(SysAuditLog log) {
        return new AuditLogResponse(
            log.getId(),
            log.getTenantId(),
            log.getUserId(),
            log.getUsername(),
            log.getRoles(),
            log.getRequestId(),
            log.getAction(),
            log.getResourceType(),
            log.getResourceId(),
            log.getMethod(),
            log.getPath(),
            log.getQueryString(),
            log.getStatusCode(),
            log.getSuccess(),
            log.getLatencyMs(),
            log.getIp(),
            log.getUserAgent(),
            log.getCreatedAt()
        );
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return 100;
        }
        return Math.max(1, Math.min(limit, 500));
    }
}
