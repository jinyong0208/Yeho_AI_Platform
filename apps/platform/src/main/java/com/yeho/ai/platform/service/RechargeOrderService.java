package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.gateway.RechargeOrderCreateRequest;
import com.yeho.ai.platform.dto.gateway.RechargeOrderResponse;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.entity.TenantRechargeOrder;
import com.yeho.ai.platform.mapper.TenantMapper;
import com.yeho.ai.platform.mapper.TenantRechargeOrderMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RechargeOrderService {
    private static final DateTimeFormatter ORDER_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final TenantRechargeOrderMapper tenantRechargeOrderMapper;
    private final TenantMapper tenantMapper;
    private final AiWalletService aiWalletService;

    @Transactional
    public RechargeOrderResponse create(RechargeOrderCreateRequest request) {
        Tenant tenant = tenantMapper.selectById(request.getTenantId());
        if (tenant == null) {
            throw new NotFoundException("Tenant not found");
        }

        LocalDateTime now = LocalDateTime.now();
        TenantRechargeOrder order = new TenantRechargeOrder();
        order.setTenantId(request.getTenantId());
        order.setOrderNo(generateOrderNo());
        order.setAmountCny(request.getAmountCny());
        order.setCredits(request.getCredits());
        order.setStatus("CREATED");
        order.setPayChannel(normalizeText(request.getPayChannel(), "BANK_TRANSFER"));
        order.setPayerName(normalizeText(request.getPayerName(), null));
        order.setPayerAccount(normalizeText(request.getPayerAccount(), null));
        order.setPaymentProofNo(normalizeText(request.getPaymentProofNo(), null));
        order.setRemark(request.getRemark());
        order.setCreatedAt(now);
        order.setUpdatedAt(now);
        tenantRechargeOrderMapper.insert(order);
        return toResponse(order);
    }

    @Transactional
    public RechargeOrderResponse confirm(Long id) {
        TenantRechargeOrder order = tenantRechargeOrderMapper.selectByIdForUpdate(id);
        if (order == null) {
            throw new NotFoundException("Recharge order not found");
        }
        if ("PAID".equals(order.getStatus())) {
            return toResponse(order);
        }
        if (!"CREATED".equals(order.getStatus())) {
            throw new BusinessException("Recharge order cannot be confirmed");
        }

        LocalDateTime now = LocalDateTime.now();
        order.setStatus("PAID");
        order.setPaidAt(now);
        order.setUpdatedAt(now);
        tenantRechargeOrderMapper.updateById(order);
        aiWalletService.recharge(order.getTenantId(), order.getCredits(), order.getOrderNo(), "Recharge order confirmed");
        return toResponse(order);
    }

    @Transactional
    public RechargeOrderResponse close(Long id) {
        TenantRechargeOrder order = tenantRechargeOrderMapper.selectByIdForUpdate(id);
        if (order == null) {
            throw new NotFoundException("Recharge order not found");
        }
        if ("CLOSED".equals(order.getStatus())) {
            return toResponse(order);
        }
        if (!"CREATED".equals(order.getStatus())) {
            throw new BusinessException("Recharge order cannot be closed");
        }

        order.setStatus("CLOSED");
        order.setUpdatedAt(LocalDateTime.now());
        tenantRechargeOrderMapper.updateById(order);
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public RechargeOrderResponse get(Long id) {
        TenantRechargeOrder order = tenantRechargeOrderMapper.selectById(id);
        if (order == null) {
            throw new NotFoundException("Recharge order not found");
        }
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public List<RechargeOrderResponse> list(Long tenantId, Integer limit) {
        int safeLimit = normalizeLimit(limit);
        LambdaQueryWrapper<TenantRechargeOrder> wrapper = new LambdaQueryWrapper<TenantRechargeOrder>()
            .orderByDesc(TenantRechargeOrder::getCreatedAt)
            .last("LIMIT " + safeLimit);
        if (tenantId != null) {
            wrapper.eq(TenantRechargeOrder::getTenantId, tenantId);
        }
        return tenantRechargeOrderMapper.selectList(wrapper)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    private RechargeOrderResponse toResponse(TenantRechargeOrder order) {
        return new RechargeOrderResponse(
            order.getId(),
            order.getTenantId(),
            order.getOrderNo(),
            order.getAmountCny(),
            order.getCredits(),
            order.getStatus(),
            order.getPayChannel(),
            order.getPayerName(),
            order.getPayerAccount(),
            order.getPaymentProofNo(),
            order.getPaidAt(),
            order.getRemark(),
            order.getCreatedAt(),
            order.getUpdatedAt()
        );
    }

    private String generateOrderNo() {
        return "RCG" + ORDER_TIME_FORMAT.format(LocalDateTime.now())
            + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return 100;
        }
        return Math.max(1, Math.min(limit, 500));
    }

    private String normalizeText(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim();
    }
}
