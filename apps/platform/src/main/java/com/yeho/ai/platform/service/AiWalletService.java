package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.dto.gateway.WalletLogResponse;
import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatMessage;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.TenantWallet;
import com.yeho.ai.platform.entity.TenantWalletLog;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.TenantWalletLogMapper;
import com.yeho.ai.platform.mapper.TenantWalletMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiWalletService {
    private final TenantWalletMapper tenantWalletMapper;
    private final TenantWalletLogMapper tenantWalletLogMapper;

    @Value("${yeho.billing.default-wallet-credits:100000}")
    private long defaultWalletCredits;

    @Transactional
    public long reserve(Long tenantId, long estimatedChargeCredits, String requestId) {
        TenantWallet wallet = lockOrCreateWallet(tenantId);
        if (wallet.getBalanceCredits() < estimatedChargeCredits) {
            throw new GatewayException(HttpStatus.PAYMENT_REQUIRED, "insufficient_credits", "Insufficient credits");
        }

        wallet.setBalanceCredits(wallet.getBalanceCredits() - estimatedChargeCredits);
        wallet.setFrozenCredits(wallet.getFrozenCredits() + estimatedChargeCredits);
        wallet.setUpdatedAt(LocalDateTime.now());
        tenantWalletMapper.updateById(wallet);

        insertLog(tenantId, "AI_CHAT", requestId, "RESERVE", estimatedChargeCredits, wallet.getBalanceCredits(), "Reserve credits");
        return estimatedChargeCredits;
    }

    @Transactional
    public long settle(Long tenantId, long reservedCredits, long actualChargeCredits, String requestId) {
        TenantWallet wallet = lockExistingWallet(tenantId);
        long releaseCredits = Math.max(0L, reservedCredits - actualChargeCredits);
        long topUpCredits = Math.max(0L, actualChargeCredits - reservedCredits);

        if (topUpCredits > 0 && wallet.getBalanceCredits() < topUpCredits) {
            throw new GatewayException(HttpStatus.PAYMENT_REQUIRED, "insufficient_credits", "Insufficient credits");
        }

        wallet.setFrozenCredits(wallet.getFrozenCredits() - reservedCredits);
        wallet.setBalanceCredits(wallet.getBalanceCredits() + releaseCredits - topUpCredits);
        wallet.setTotalUsedCredits(wallet.getTotalUsedCredits() + actualChargeCredits);
        wallet.setUpdatedAt(LocalDateTime.now());
        tenantWalletMapper.updateById(wallet);

        if (releaseCredits > 0) {
            insertLog(tenantId, "AI_CHAT", requestId, "RELEASE", releaseCredits, wallet.getBalanceCredits(), "Release unused reserved credits");
        }
        if (topUpCredits > 0) {
            insertLog(tenantId, "AI_CHAT", requestId, "TOP_UP", topUpCredits, wallet.getBalanceCredits(), "Top up underestimated charge");
        }
        insertLog(tenantId, "AI_CHAT", requestId, "SETTLE", actualChargeCredits, wallet.getBalanceCredits(), "Settle AI usage");
        return actualChargeCredits;
    }

    @Transactional
    public void release(Long tenantId, long reservedCredits, String requestId, String remark) {
        if (reservedCredits <= 0) {
            return;
        }
        TenantWallet wallet = lockExistingWallet(tenantId);
        wallet.setFrozenCredits(wallet.getFrozenCredits() - reservedCredits);
        wallet.setBalanceCredits(wallet.getBalanceCredits() + reservedCredits);
        wallet.setUpdatedAt(LocalDateTime.now());
        tenantWalletMapper.updateById(wallet);
        insertLog(tenantId, "AI_CHAT", requestId, "RELEASE", reservedCredits, wallet.getBalanceCredits(), remark);
    }

    public long estimateChargeCredits(AiModel model, ChatCompletionRequest request) {
        int promptTokens = estimatePromptTokens(request.getMessages());
        int maxTokens = request.getMaxTokens() == null ? 512 : request.getMaxTokens();
        return calculateChargeCredits(model, promptTokens, maxTokens);
    }

    public long calculateChargeCredits(AiModel model, int inputTokens, int outputTokens) {
        BigDecimal input = BigDecimal.valueOf(inputTokens).multiply(nullSafe(model.getInputCreditRate()));
        BigDecimal output = BigDecimal.valueOf(outputTokens).multiply(nullSafe(model.getOutputCreditRate()));
        BigDecimal multiplier = nullSafe(model.getBillingMultiplier());
        BigDecimal total = input.add(output).multiply(multiplier);
        return total.setScale(0, RoundingMode.CEILING).longValue();
    }

    public BigDecimal calculateRealCost(AiModel model, int inputTokens, int outputTokens) {
        BigDecimal input = BigDecimal.valueOf(inputTokens).multiply(nullSafe(model.getInputPrice()));
        BigDecimal output = BigDecimal.valueOf(outputTokens).multiply(nullSafe(model.getOutputPrice()));
        return input.add(output);
    }

    public int estimatePromptTokens(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return 1;
        }
        int charCount = messages.stream()
            .mapToInt(message -> message.getContent() == null ? 0 : message.getContent().length())
            .sum();
        return Math.max(1, charCount);
    }

    public int estimateCompletionTokens(String content) {
        if (content == null || content.isEmpty()) {
            return 1;
        }
        return Math.max(1, content.length());
    }

    public String summarizePrompt(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        int limit = Math.min(messages.size(), 3);
        for (int i = 0; i < limit; i++) {
            ChatMessage message = messages.get(i);
            if (i > 0) {
                builder.append(" | ");
            }
            builder.append(message.getRole()).append(":").append(truncate(message.getContent(), 64));
        }
        if (messages.size() > limit) {
            builder.append(" | ...");
        }
        return truncate(builder.toString(), 512);
    }

    @Transactional(readOnly = true)
    public TenantWallet viewWallet(Long tenantId) {
        return tenantWalletMapper.selectOne(new LambdaQueryWrapper<TenantWallet>()
            .eq(TenantWallet::getTenantId, tenantId));
    }

    @Transactional
    public TenantWallet ensureWallet(Long tenantId) {
        return lockOrCreateWallet(tenantId);
    }

    @Transactional
    public TenantWallet recharge(Long tenantId, long amountCredits, String bizId, String remark) {
        TenantWallet wallet = lockOrCreateWallet(tenantId);
        wallet.setBalanceCredits(wallet.getBalanceCredits() + amountCredits);
        wallet.setTotalRechargeCredits(wallet.getTotalRechargeCredits() + amountCredits);
        wallet.setUpdatedAt(LocalDateTime.now());
        tenantWalletMapper.updateById(wallet);

        String logBizId = bizId == null ? "MANUAL-" + UUID.randomUUID().toString().replace("-", "") : bizId;
        insertLog(tenantId, "RECHARGE", logBizId, "IN", amountCredits, wallet.getBalanceCredits(), remark);
        return wallet;
    }

    @Transactional(readOnly = true)
    public List<WalletLogResponse> listLogs(Long tenantId, Integer limit) {
        int safeLimit = normalizeLimit(limit);
        return tenantWalletLogMapper.selectList(new LambdaQueryWrapper<TenantWalletLog>()
                .eq(TenantWalletLog::getTenantId, tenantId)
                .orderByDesc(TenantWalletLog::getCreatedAt)
                .last("LIMIT " + safeLimit))
            .stream()
            .map(this::toLogResponse)
            .toList();
    }

    private TenantWallet lockOrCreateWallet(Long tenantId) {
        TenantWallet wallet = tenantWalletMapper.selectByTenantIdForUpdate(tenantId);
        if (wallet != null) {
            return wallet;
        }

        TenantWallet created = new TenantWallet();
        created.setTenantId(tenantId);
        created.setBalanceCredits(defaultWalletCredits);
        created.setFrozenCredits(0L);
        created.setTotalRechargeCredits(defaultWalletCredits);
        created.setTotalUsedCredits(0L);
        created.setUpdatedAt(LocalDateTime.now());
        tenantWalletMapper.insert(created);
        return tenantWalletMapper.selectByTenantIdForUpdate(tenantId);
    }

    private TenantWallet lockExistingWallet(Long tenantId) {
        TenantWallet wallet = tenantWalletMapper.selectByTenantIdForUpdate(tenantId);
        if (wallet == null) {
            throw new GatewayException(HttpStatus.NOT_FOUND, "wallet_not_found", "Tenant wallet not found");
        }
        return wallet;
    }

    private void insertLog(Long tenantId, String bizType, String bizId, String direction, long amountCredits, long balanceAfter, String remark) {
        TenantWalletLog log = new TenantWalletLog();
        log.setTenantId(tenantId);
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setDirection(direction);
        log.setAmountCredits(amountCredits);
        log.setBalanceAfter(balanceAfter);
        log.setRemark(remark);
        log.setCreatedAt(LocalDateTime.now());
        tenantWalletLogMapper.insert(log);
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value == null ? "" : value;
        }
        return value.substring(0, maxLength);
    }

    private WalletLogResponse toLogResponse(TenantWalletLog log) {
        return new WalletLogResponse(
            log.getId(),
            log.getTenantId(),
            log.getBizType(),
            log.getBizId(),
            log.getDirection(),
            log.getAmountCredits(),
            log.getBalanceAfter(),
            log.getRemark(),
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
