package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.dto.gateway.UsageLogResponse;
import com.yeho.ai.platform.dto.gateway.UsageSummaryResponse;
import com.yeho.ai.platform.entity.AiUsageLog;
import com.yeho.ai.platform.mapper.AiUsageLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UsageQueryService {
    private final AiUsageLogMapper aiUsageLogMapper;

    @Transactional(readOnly = true)
    public List<UsageLogResponse> list(
        Long tenantId,
        Long apiKeyId,
        String providerCode,
        String modelCode,
        Boolean success,
        LocalDateTime from,
        LocalDateTime to,
        Integer limit
    ) {
        return aiUsageLogMapper.selectList(buildWrapper(
                tenantId,
                apiKeyId,
                providerCode,
                modelCode,
                success,
                from,
                to,
                normalizeLimit(limit)
            ))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public UsageSummaryResponse summary(
        Long tenantId,
        Long apiKeyId,
        String providerCode,
        String modelCode,
        LocalDateTime from,
        LocalDateTime to
    ) {
        List<AiUsageLog> logs = aiUsageLogMapper.selectList(buildWrapper(
            tenantId,
            apiKeyId,
            providerCode,
            modelCode,
            null,
            from,
            to,
            null
        ));

        long requestCount = logs.size();
        long successCount = logs.stream().filter(log -> Boolean.TRUE.equals(log.getSuccess())).count();
        long inputTokens = logs.stream().mapToLong(log -> nullSafe(log.getInputTokens())).sum();
        long outputTokens = logs.stream().mapToLong(log -> nullSafe(log.getOutputTokens())).sum();
        long totalTokens = logs.stream().mapToLong(log -> nullSafe(log.getTotalTokens())).sum();
        long chargeCredits = logs.stream().mapToLong(log -> log.getChargeCredits() == null ? 0L : log.getChargeCredits()).sum();
        BigDecimal realCost = logs.stream()
            .map(log -> log.getRealCost() == null ? BigDecimal.ZERO : log.getRealCost())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal profit = logs.stream()
            .map(log -> log.getProfit() == null ? BigDecimal.ZERO : log.getProfit())
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new UsageSummaryResponse(
            tenantId,
            requestCount,
            successCount,
            requestCount - successCount,
            inputTokens,
            outputTokens,
            totalTokens,
            chargeCredits,
            realCost,
            profit
        );
    }

    private LambdaQueryWrapper<AiUsageLog> buildWrapper(
        Long tenantId,
        Long apiKeyId,
        String providerCode,
        String modelCode,
        Boolean success,
        LocalDateTime from,
        LocalDateTime to,
        Integer limit
    ) {
        LambdaQueryWrapper<AiUsageLog> wrapper = new LambdaQueryWrapper<AiUsageLog>()
            .orderByDesc(AiUsageLog::getCreatedAt);
        if (tenantId != null) {
            wrapper.eq(AiUsageLog::getTenantId, tenantId);
        }
        if (apiKeyId != null) {
            wrapper.eq(AiUsageLog::getApiKeyId, apiKeyId);
        }
        if (StringUtils.hasText(providerCode)) {
            wrapper.eq(AiUsageLog::getProviderCode, providerCode);
        }
        if (StringUtils.hasText(modelCode)) {
            wrapper.eq(AiUsageLog::getModelCode, modelCode);
        }
        if (success != null) {
            wrapper.eq(AiUsageLog::getSuccess, success);
        }
        if (from != null) {
            wrapper.ge(AiUsageLog::getCreatedAt, from);
        }
        if (to != null) {
            wrapper.le(AiUsageLog::getCreatedAt, to);
        }
        if (limit != null) {
            wrapper.last("LIMIT " + limit);
        }
        return wrapper;
    }

    private UsageLogResponse toResponse(AiUsageLog log) {
        return new UsageLogResponse(
            log.getId(),
            log.getTenantId(),
            log.getApiKeyId(),
            log.getProviderCode(),
            log.getModelCode(),
            log.getRequestId(),
            log.getInputTokens(),
            log.getOutputTokens(),
            log.getTotalTokens(),
            log.getRealCost(),
            log.getChargeCredits(),
            log.getProfit(),
            log.getLatencyMs(),
            log.getSuccess(),
            log.getErrorCode(),
            log.getErrorMessage(),
            log.getPromptSummary(),
            log.getCreatedAt()
        );
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return 100;
        }
        return Math.max(1, Math.min(limit, 500));
    }

    private long nullSafe(Integer value) {
        return value == null ? 0L : value.longValue();
    }
}
