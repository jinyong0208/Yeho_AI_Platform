package com.yeho.ai.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_audit_log")
public class SysAuditLog {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long tenantId;
    private Long userId;
    private String username;
    private String roles;
    private String requestId;
    private String action;
    private String resourceType;
    private String resourceId;
    private String method;
    private String path;
    private String queryString;
    private Integer statusCode;
    private Boolean success;
    private Long latencyMs;
    private String ip;
    private String userAgent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
