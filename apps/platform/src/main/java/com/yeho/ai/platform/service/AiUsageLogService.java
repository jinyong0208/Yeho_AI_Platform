package com.yeho.ai.platform.service;

import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.entity.AgentExecuteLog;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.AiUsageLog;
import com.yeho.ai.platform.mapper.AgentExecuteLogMapper;
import com.yeho.ai.platform.mapper.AiUsageLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AiUsageLogService {
    private final AiUsageLogMapper aiUsageLogMapper;
    private final AgentExecuteLogMapper agentExecuteLogMapper;
    private final AiWalletService aiWalletService;

    @Transactional
    public void record(
        Long tenantId,
        Long userId,
        Long apiKeyId,
        String providerCode,
        String modelCode,
        String requestId,
        int inputTokens,
        int outputTokens,
        int totalTokens,
        long chargeCredits,
        AiModel model,
        long latencyMs,
        boolean success,
        String errorCode,
        String errorMessage,
        ChatCompletionRequest request
    ) {
        record(
            tenantId,
            userId,
            apiKeyId,
            providerCode,
            modelCode,
            requestId,
            inputTokens,
            outputTokens,
            totalTokens,
            chargeCredits,
            model,
            latencyMs,
            success,
            errorCode,
            errorMessage,
            request,
            null,
            GatewayRequestContext.empty()
        );
    }

    @Transactional
    public void record(
        Long tenantId,
        Long userId,
        Long apiKeyId,
        String providerCode,
        String modelCode,
        String requestId,
        int inputTokens,
        int outputTokens,
        int totalTokens,
        long chargeCredits,
        AiModel model,
        long latencyMs,
        boolean success,
        String errorCode,
        String errorMessage,
        ChatCompletionRequest request,
        String apiKeyScopes
    ) {
        record(
            tenantId,
            userId,
            apiKeyId,
            providerCode,
            modelCode,
            requestId,
            inputTokens,
            outputTokens,
            totalTokens,
            chargeCredits,
            model,
            latencyMs,
            success,
            errorCode,
            errorMessage,
            request,
            apiKeyScopes,
            GatewayRequestContext.empty()
        );
    }

    @Transactional
    public void record(
        Long tenantId,
        Long userId,
        Long apiKeyId,
        String providerCode,
        String modelCode,
        String requestId,
        int inputTokens,
        int outputTokens,
        int totalTokens,
        long chargeCredits,
        AiModel model,
        long latencyMs,
        boolean success,
        String errorCode,
        String errorMessage,
        ChatCompletionRequest request,
        String apiKeyScopes,
        GatewayRequestContext gatewayContext
    ) {
        AiUsageLog log = new AiUsageLog();
        log.setTenantId(tenantId);
        log.setUserId(userId);
        log.setApiKeyId(apiKeyId);
        log.setProviderCode(providerCode);
        log.setModelCode(modelCode);
        log.setRequestId(requestId);
        log.setSystemCode(gatewayContext == null ? null : gatewayContext.systemCode());
        log.setDataDomain(gatewayContext == null ? null : gatewayContext.dataDomain());
        log.setAgentCode(gatewayContext == null ? null : gatewayContext.agentCode());
        log.setWorkflowCode(gatewayContext == null ? null : gatewayContext.workflowCode());
        log.setApiKeyScopes(apiKeyScopes);
        log.setPriceVersionId(model == null ? null : model.getCurrentPriceVersionId());
        log.setInputTokens(inputTokens);
        log.setOutputTokens(outputTokens);
        log.setTotalTokens(totalTokens);
        log.setRealCost(calculateRealCost(model, inputTokens, outputTokens));
        log.setChargeCredits(chargeCredits);
        log.setProfit(BigDecimal.valueOf(chargeCredits).subtract(log.getRealCost()));
        log.setLatencyMs(latencyMs);
        log.setSuccess(success);
        log.setErrorCode(errorCode);
        log.setErrorMessage(truncate(errorMessage, 512));
        log.setPromptSummary(aiWalletService.summarizePrompt(request.getMessages()));
        log.setCreatedAt(LocalDateTime.ofInstant(Instant.now(), java.time.ZoneId.systemDefault()));
        aiUsageLogMapper.insert(log);
        recordAgentExecuteLog(log, gatewayContext);
    }

    private void recordAgentExecuteLog(AiUsageLog usageLog, GatewayRequestContext gatewayContext) {
        if (usageLog.getTenantId() == null || gatewayContext == null
                || (!StringUtils.hasText(gatewayContext.agentCode()) && !StringUtils.hasText(gatewayContext.workflowCode()))) {
            return;
        }
        AgentExecuteLog log = new AgentExecuteLog();
        log.setRequestId(usageLog.getRequestId());
        log.setTenantId(usageLog.getTenantId());
        log.setSystemCode(gatewayContext.systemCode());
        log.setDataDomain(gatewayContext.dataDomain());
        log.setAgentCode(gatewayContext.agentCode());
        log.setWorkflowCode(gatewayContext.workflowCode());
        log.setModel(usageLog.getModelCode());
        log.setLatencyMs(usageLog.getLatencyMs());
        log.setInputTokens(toLong(usageLog.getInputTokens()));
        log.setOutputTokens(toLong(usageLog.getOutputTokens()));
        log.setTotalTokens(toLong(usageLog.getTotalTokens()));
        log.setChargeCredits(usageLog.getChargeCredits());
        log.setSuccess(usageLog.getSuccess());
        log.setErrorCode(usageLog.getErrorCode());
        log.setErrorMessage(usageLog.getErrorMessage());
        log.setTraceId(usageLog.getRequestId());
        log.setCreatedAt(usageLog.getCreatedAt());
        agentExecuteLogMapper.insert(log);
    }

    private Long toLong(Integer value) {
        return value == null ? 0L : value.longValue();
    }

    private BigDecimal calculateRealCost(AiModel model, int inputTokens, int outputTokens) {
        if (model == null) {
            return BigDecimal.ZERO;
        }
        return aiWalletService.calculateRealCost(model, inputTokens, outputTokens);
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
