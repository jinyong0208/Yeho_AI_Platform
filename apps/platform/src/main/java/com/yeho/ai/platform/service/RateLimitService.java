package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.RequestContext;
import com.yeho.ai.platform.entity.ApiKeyRateLimit;
import com.yeho.ai.platform.entity.SysAuditLog;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.entity.TenantRateLimit;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.ApiKeyRateLimitMapper;
import com.yeho.ai.platform.mapper.TenantRateLimitMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RateLimitService {
    private static final Duration MINUTE_TTL = Duration.ofMinutes(2);
    private static final Duration DAY_TTL = Duration.ofDays(2);

    private final StringRedisTemplate redisTemplate;
    private final TenantRateLimitMapper tenantRateLimitMapper;
    private final ApiKeyRateLimitMapper apiKeyRateLimitMapper;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public RateLimitLease acquire(TenantApiKey apiKey, int estimatedTokens, long reservedCredits, String requestId) {
        LimitConfig tenantLimit = activeTenantLimit(apiKey.getTenantId());
        LimitConfig apiKeyLimit = activeApiKeyLimit(apiKey.getId());
        try {
            checkBucket("tenant", String.valueOf(apiKey.getTenantId()), tenantLimit, estimatedTokens, reservedCredits);
            checkBucket("api-key", String.valueOf(apiKey.getId()), apiKeyLimit, estimatedTokens, reservedCredits);
            return new RateLimitLease(apiKey.getTenantId(), apiKey.getId(), estimatedTokens, reservedCredits);
        } catch (GatewayException ex) {
            recordLimitAudit(apiKey, requestId, ex.getCode(), ex.getMessage());
            throw ex;
        }
    }

    public void releaseConcurrent(RateLimitLease lease) {
        if (lease == null) {
            return;
        }
        decrement(concurrentKey("tenant", String.valueOf(lease.tenantId())));
        decrement(concurrentKey("api-key", String.valueOf(lease.apiKeyId())));
    }

    public void releaseDailyCredits(RateLimitLease lease, long credits) {
        if (lease == null || credits <= 0) {
            return;
        }
        decrementBy(dailyCreditsKey("tenant", String.valueOf(lease.tenantId())), credits);
        decrementBy(dailyCreditsKey("api-key", String.valueOf(lease.apiKeyId())), credits);
    }

    private void checkBucket(String type, String id, LimitConfig limit, int tokens, long credits) {
        if (limit == null) {
            return;
        }
        checkCounter(minuteKey(type, id, "rpm"), limit.rpmLimit(), 1, MINUTE_TTL, "rate_limit_rpm_exceeded");
        checkCounter(minuteKey(type, id, "tpm"), limit.tpmLimit(), Math.max(tokens, 0), MINUTE_TTL, "rate_limit_tpm_exceeded");
        checkCounter(dailyCreditsKey(type, id), limit.dailyCreditsLimit(), Math.max(credits, 0), DAY_TTL, "daily_credits_limit_exceeded");
        checkConcurrent(type, id, limit.maxConcurrent());
    }

    private void checkCounter(String key, Number limit, long increment, Duration ttl, String code) {
        if (limit == null || limit.longValue() <= 0 || increment <= 0) {
            return;
        }
        Long value = redisTemplate.opsForValue().increment(key, increment);
        if (value != null && value == increment) {
            redisTemplate.expire(key, ttl);
        }
        if (value != null && value > limit.longValue()) {
            decrementBy(key, increment);
            throw new GatewayException(HttpStatus.TOO_MANY_REQUESTS, code, "Rate limit exceeded");
        }
    }

    private void checkConcurrent(String type, String id, Integer maxConcurrent) {
        if (maxConcurrent == null || maxConcurrent <= 0) {
            return;
        }
        String key = concurrentKey(type, id);
        Long value = redisTemplate.opsForValue().increment(key);
        if (value != null && value == 1L) {
            redisTemplate.expire(key, Duration.ofMinutes(10));
        }
        if (value != null && value > maxConcurrent) {
            decrement(key);
            throw new GatewayException(HttpStatus.TOO_MANY_REQUESTS, "rate_limit_concurrent_exceeded", "Max concurrent limit exceeded");
        }
    }

    private void decrement(String key) {
        Long value = redisTemplate.opsForValue().decrement(key);
        if (value != null && value <= 0) {
            redisTemplate.delete(key);
        }
    }

    private void decrementBy(String key, long amount) {
        Long value = redisTemplate.opsForValue().decrement(key, amount);
        if (value != null && value <= 0) {
            redisTemplate.delete(key);
        }
    }

    private LimitConfig activeTenantLimit(Long tenantId) {
        TenantRateLimit limit = tenantRateLimitMapper.selectOne(new LambdaQueryWrapper<TenantRateLimit>()
            .eq(TenantRateLimit::getTenantId, tenantId)
            .eq(TenantRateLimit::getStatus, "ACTIVE"));
        return limit == null ? null : new LimitConfig(
            limit.getRpmLimit(),
            limit.getTpmLimit(),
            limit.getDailyCreditsLimit(),
            limit.getMaxConcurrent()
        );
    }

    private LimitConfig activeApiKeyLimit(Long apiKeyId) {
        ApiKeyRateLimit limit = apiKeyRateLimitMapper.selectOne(new LambdaQueryWrapper<ApiKeyRateLimit>()
            .eq(ApiKeyRateLimit::getApiKeyId, apiKeyId)
            .eq(ApiKeyRateLimit::getStatus, "ACTIVE"));
        return limit == null ? null : new LimitConfig(
            limit.getRpmLimit(),
            limit.getTpmLimit(),
            limit.getDailyCreditsLimit(),
            limit.getMaxConcurrent()
        );
    }

    private String minuteKey(String type, String id, String metric) {
        return "rate:" + type + ":" + id + ":" + metric + ":" + (System.currentTimeMillis() / 60_000);
    }

    private String dailyCreditsKey(String type, String id) {
        return "rate:" + type + ":" + id + ":daily_credits:" + LocalDate.now();
    }

    private String concurrentKey(String type, String id) {
        return "rate:" + type + ":" + id + ":concurrent";
    }

    private void recordLimitAudit(TenantApiKey apiKey, String requestId, String code, String message) {
        SysAuditLog log = new SysAuditLog();
        log.setTenantId(apiKey.getTenantId());
        log.setRequestId(requestId != null ? requestId : RequestContext.getRequestId());
        log.setAction("RATE_LIMIT");
        log.setResourceType("ai_gateway");
        log.setResourceId(String.valueOf(apiKey.getId()));
        log.setMethod("POST");
        log.setPath("/v1/chat/completions");
        log.setStatusCode(429);
        log.setSuccess(false);
        log.setLatencyMs(0L);
        log.setQueryString(code + ":" + message);
        log.setCreatedAt(LocalDateTime.now());
        log.setUpdatedAt(LocalDateTime.now());
        auditLogService.record(log);
    }

    private record LimitConfig(Integer rpmLimit, Integer tpmLimit, Long dailyCreditsLimit, Integer maxConcurrent) {
    }

    public record RateLimitLease(Long tenantId, Long apiKeyId, int estimatedTokens, long reservedCredits) {
    }
}
