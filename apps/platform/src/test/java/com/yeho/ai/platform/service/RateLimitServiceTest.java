package com.yeho.ai.platform.service;

import com.yeho.ai.platform.entity.ApiKeyRateLimit;
import com.yeho.ai.platform.entity.SysAuditLog;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.entity.TenantRateLimit;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.ApiKeyRateLimitMapper;
import com.yeho.ai.platform.mapper.TenantRateLimitMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;

import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RateLimitServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private TenantRateLimitMapper tenantRateLimitMapper;

    @Mock
    private ApiKeyRateLimitMapper apiKeyRateLimitMapper;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private RateLimitService service;

    @Test
    void acquireWithoutActiveLimitsDoesNotTouchRedis() {
        TenantApiKey apiKey = apiKey(7L, 11L);
        when(tenantRateLimitMapper.selectOne(any())).thenReturn(null);
        when(apiKeyRateLimitMapper.selectOne(any())).thenReturn(null);

        RateLimitService.RateLimitLease lease = service.acquire(apiKey, 10, 5L, "req-ok");

        assertThat(lease.tenantId()).isEqualTo(7L);
        assertThat(lease.apiKeyId()).isEqualTo(11L);
        verify(valueOperations, never()).increment(anyString(), anyLong());
        verify(valueOperations, never()).increment(anyString());
    }

    @Test
    void tenantRpmLimitExceededRollsBackFailingCounterAndAudits() {
        TenantApiKey apiKey = apiKey(7L, 11L);
        when(tenantRateLimitMapper.selectOne(any())).thenReturn(tenantLimit(7L, 1, null, null, null));
        when(apiKeyRateLimitMapper.selectOne(any())).thenReturn(null);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(keyContaining("tenant:7:rpm"), eq(1L))).thenReturn(2L);
        when(valueOperations.decrement(anyString(), anyLong())).thenReturn(1L);

        assertThatThrownBy(() -> service.acquire(apiKey, 10, 5L, "req-rpm"))
            .isInstanceOfSatisfying(GatewayException.class, ex -> {
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                assertThat(ex.getCode()).isEqualTo("rate_limit_rpm_exceeded");
            });

        verify(valueOperations).decrement(keyContaining("tenant:7:rpm"), eq(1L));
        ArgumentCaptor<SysAuditLog> logCaptor = ArgumentCaptor.forClass(SysAuditLog.class);
        verify(auditLogService).record(logCaptor.capture());
        assertThat(logCaptor.getValue().getTenantId()).isEqualTo(7L);
        assertThat(logCaptor.getValue().getRequestId()).isEqualTo("req-rpm");
        assertThat(logCaptor.getValue().getAction()).isEqualTo("RATE_LIMIT");
        assertThat(logCaptor.getValue().getStatusCode()).isEqualTo(429);
        assertThat(logCaptor.getValue().getQueryString()).contains("rate_limit_rpm_exceeded");
    }

    @Test
    void apiKeyLimitFailureRollsBackTenantReservations() {
        TenantApiKey apiKey = apiKey(7L, 11L);
        when(tenantRateLimitMapper.selectOne(any()))
            .thenReturn(tenantLimit(7L, 100, 100, 100L, 1));
        when(apiKeyRateLimitMapper.selectOne(any()))
            .thenReturn(apiKeyLimit(7L, 11L, 1, null, null, null));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString(), anyLong())).thenAnswer(invocation -> {
            String key = invocation.getArgument(0);
            Long amount = invocation.getArgument(1);
            if (key.contains("api-key:11:rpm")) {
                return 2L;
            }
            return amount;
        });
        when(valueOperations.increment(anyString())).thenReturn(1L);
        when(valueOperations.decrement(anyString(), anyLong())).thenReturn(0L);

        assertThatThrownBy(() -> service.acquire(apiKey, 10, 5L, "req-api-key-rpm"))
            .isInstanceOfSatisfying(GatewayException.class, ex -> {
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                assertThat(ex.getCode()).isEqualTo("rate_limit_rpm_exceeded");
            });

        verify(valueOperations).decrement(keyContaining("api-key:11:rpm"), eq(1L));
        verify(valueOperations).decrement(keyContaining("tenant:7:concurrent"), eq(1L));
        verify(valueOperations).decrement(keyContaining("tenant:7:daily_credits"), eq(5L));
        verify(valueOperations).decrement(keyContaining("tenant:7:tpm"), eq(10L));
        verify(valueOperations).decrement(keyContaining("tenant:7:rpm"), eq(1L));
    }

    @Test
    void auditFailureDoesNotSuppressRateLimitRejection() {
        TenantApiKey apiKey = apiKey(7L, 11L);
        when(tenantRateLimitMapper.selectOne(any())).thenReturn(tenantLimit(7L, 1, null, null, null));
        when(apiKeyRateLimitMapper.selectOne(any())).thenReturn(null);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(keyContaining("tenant:7:rpm"), eq(1L))).thenReturn(2L);
        when(valueOperations.decrement(anyString(), anyLong())).thenReturn(1L);
        doThrow(new IllegalStateException("audit table unavailable"))
            .when(auditLogService).record(any(SysAuditLog.class));

        assertThatThrownBy(() -> service.acquire(apiKey, 10, 5L, "req-audit-fails"))
            .isInstanceOfSatisfying(GatewayException.class, ex -> {
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                assertThat(ex.getCode()).isEqualTo("rate_limit_rpm_exceeded");
            });

        verify(valueOperations).decrement(keyContaining("tenant:7:rpm"), eq(1L));
    }

    @Test
    void releaseMethodsReturnConcurrentAndUnusedDailyCredits() {
        RateLimitService.RateLimitLease lease = new RateLimitService.RateLimitLease(7L, 11L, 10, 20L);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.decrement(anyString(), anyLong())).thenReturn(0L);
        when(valueOperations.decrement(anyString())).thenReturn(0L);

        service.releaseConcurrent(lease);
        service.releaseDailyCredits(lease, 6L);

        verify(valueOperations).decrement(keyContaining("tenant:7:concurrent"));
        verify(valueOperations).decrement(keyContaining("api-key:11:concurrent"));
        verify(valueOperations).decrement(keyContaining("tenant:7:daily_credits"), eq(6L));
        verify(valueOperations).decrement(keyContaining("api-key:11:daily_credits"), eq(6L));
    }

    private TenantApiKey apiKey(Long tenantId, Long apiKeyId) {
        TenantApiKey apiKey = new TenantApiKey();
        apiKey.setTenantId(tenantId);
        apiKey.setId(apiKeyId);
        return apiKey;
    }

    private TenantRateLimit tenantLimit(Long tenantId, Integer rpm, Integer tpm, Long dailyCredits, Integer maxConcurrent) {
        TenantRateLimit limit = new TenantRateLimit();
        limit.setTenantId(tenantId);
        limit.setRpmLimit(rpm);
        limit.setTpmLimit(tpm);
        limit.setDailyCreditsLimit(dailyCredits);
        limit.setMaxConcurrent(maxConcurrent);
        limit.setStatus("ACTIVE");
        return limit;
    }

    private ApiKeyRateLimit apiKeyLimit(
        Long tenantId,
        Long apiKeyId,
        Integer rpm,
        Integer tpm,
        Long dailyCredits,
        Integer maxConcurrent
    ) {
        ApiKeyRateLimit limit = new ApiKeyRateLimit();
        limit.setTenantId(tenantId);
        limit.setApiKeyId(apiKeyId);
        limit.setRpmLimit(rpm);
        limit.setTpmLimit(tpm);
        limit.setDailyCreditsLimit(dailyCredits);
        limit.setMaxConcurrent(maxConcurrent);
        limit.setStatus("ACTIVE");
        return limit;
    }

    private String keyContaining(String part) {
        Predicate<String> containsPart = key -> key != null && key.contains(part);
        return argThat(containsPart::test);
    }
}
