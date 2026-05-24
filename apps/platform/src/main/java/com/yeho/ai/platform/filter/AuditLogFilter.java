package com.yeho.ai.platform.filter;

import com.yeho.ai.platform.common.RequestContext;
import com.yeho.ai.platform.entity.SysAuditLog;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.AuditLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Set;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
@RequiredArgsConstructor
public class AuditLogFilter extends OncePerRequestFilter {
    private static final Set<String> SENSITIVE_QUERY_KEYS = Set.of("token", "key", "apikey", "api_key", "password", "secret");

    private final AuditLogService auditLogService;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (shouldAudit(request)) {
                record(request, response, System.currentTimeMillis() - startedAt);
            }
        }
    }

    private boolean shouldAudit(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/v1/")) {
            return false;
        }
        return !path.equals("/api/v1/health")
            && !path.startsWith("/api/v1/auth/captcha")
            && !path.startsWith("/api/v1/auth/login");
    }

    private void record(HttpServletRequest request, HttpServletResponse response, long latencyMs) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            AuthenticatedUser user = authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser principal
                ? principal
                : null;
            LocalDateTime now = LocalDateTime.now();
            SysAuditLog log = new SysAuditLog();
            if (user != null) {
                log.setTenantId(user.tenantId());
                log.setUserId(user.userId());
                log.setUsername(user.username());
                log.setRoles(String.join(",", user.roles()));
            }
            log.setRequestId(requestId(response));
            log.setAction(action(request.getMethod()));
            log.setResourceType(resourceType(request.getRequestURI()));
            log.setResourceId(resourceId(request.getRequestURI()));
            log.setMethod(request.getMethod());
            log.setPath(truncate(request.getRequestURI(), 512));
            log.setQueryString(truncate(sanitizeQuery(request.getQueryString()), 1024));
            log.setStatusCode(response.getStatus());
            log.setSuccess(response.getStatus() < 400);
            log.setLatencyMs(latencyMs);
            log.setIp(clientIp(request));
            log.setUserAgent(truncate(request.getHeader("User-Agent"), 512));
            log.setCreatedAt(now);
            log.setUpdatedAt(now);
            auditLogService.record(log);
        } catch (RuntimeException ignored) {
            // Audit logging must not change the business response.
        }
    }

    private String action(String method) {
        return switch (method) {
            case "GET" -> "READ";
            case "POST" -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            default -> method;
        };
    }

    private String resourceType(String path) {
        String[] segments = path.split("/");
        return segments.length > 3 ? segments[3] : null;
    }

    private String resourceId(String path) {
        String[] segments = path.split("/");
        return segments.length > 4 ? segments[4] : null;
    }

    private String sanitizeQuery(String queryString) {
        if (!StringUtils.hasText(queryString)) {
            return queryString;
        }
        return Arrays.stream(queryString.split("&"))
            .map(part -> {
                int index = part.indexOf('=');
                String key = index >= 0 ? part.substring(0, index) : part;
                String value = index >= 0 ? part.substring(index + 1) : "";
                if (SENSITIVE_QUERY_KEYS.contains(key.toLowerCase())) {
                    return key + "=***";
                }
                return index >= 0 ? key + "=" + value : key;
            })
            .reduce((left, right) -> left + "&" + right)
            .orElse(queryString);
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String requestId(HttpServletResponse response) {
        String requestId = RequestContext.getRequestId();
        if (StringUtils.hasText(requestId)) {
            return requestId;
        }
        return response.getHeader(RequestContext.REQUEST_ID_HEADER);
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
