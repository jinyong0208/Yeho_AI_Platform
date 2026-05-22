package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.invoice.InvoiceApplicationCreateRequest;
import com.yeho.ai.platform.dto.invoice.InvoiceApplicationResponse;
import com.yeho.ai.platform.dto.invoice.InvoiceApplicationStatusRequest;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.entity.TenantInvoiceApplication;
import com.yeho.ai.platform.mapper.TenantInvoiceApplicationMapper;
import com.yeho.ai.platform.mapper.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceApplicationService {
    private static final String STATUS_APPLIED = "APPLIED";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_ISSUED = "ISSUED";
    private static final String STATUS_REJECTED = "REJECTED";

    private final TenantInvoiceApplicationMapper invoiceApplicationMapper;
    private final TenantMapper tenantMapper;

    @Transactional
    public InvoiceApplicationResponse create(InvoiceApplicationCreateRequest request) {
        Tenant tenant = tenantMapper.selectById(request.getTenantId());
        if (tenant == null) {
            throw new NotFoundException("Tenant not found");
        }

        LocalDateTime now = LocalDateTime.now();
        TenantInvoiceApplication application = new TenantInvoiceApplication();
        application.setTenantId(request.getTenantId());
        application.setInvoiceTitle(request.getInvoiceTitle());
        application.setTaxNo(request.getTaxNo());
        application.setAmountCny(request.getAmountCny());
        application.setInvoiceType(request.getInvoiceType());
        application.setStatus(STATUS_APPLIED);
        application.setEmail(request.getEmail());
        application.setAppliedAt(now);
        application.setRemark(request.getRemark());
        application.setCreatedAt(now);
        application.setUpdatedAt(now);
        invoiceApplicationMapper.insert(application);
        return toResponse(application);
    }

    @Transactional(readOnly = true)
    public InvoiceApplicationResponse get(Long id) {
        return toResponse(requireApplication(id));
    }

    @Transactional(readOnly = true)
    public List<InvoiceApplicationResponse> list(Long tenantId, String status, Integer limit) {
        int safeLimit = normalizeLimit(limit);
        LambdaQueryWrapper<TenantInvoiceApplication> wrapper = new LambdaQueryWrapper<TenantInvoiceApplication>()
            .orderByDesc(TenantInvoiceApplication::getCreatedAt)
            .last("LIMIT " + safeLimit);
        if (tenantId != null) {
            wrapper.eq(TenantInvoiceApplication::getTenantId, tenantId);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(TenantInvoiceApplication::getStatus, status);
        }
        return invoiceApplicationMapper.selectList(wrapper)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public InvoiceApplicationResponse markProcessing(Long id, InvoiceApplicationStatusRequest request) {
        TenantInvoiceApplication application = requireApplication(id);
        if (!STATUS_APPLIED.equals(application.getStatus())) {
            throw new BusinessException("Invoice application cannot be processed");
        }
        return updateStatus(application, STATUS_PROCESSING, request, false);
    }

    @Transactional
    public InvoiceApplicationResponse markIssued(Long id, InvoiceApplicationStatusRequest request) {
        TenantInvoiceApplication application = requireApplication(id);
        if (!STATUS_APPLIED.equals(application.getStatus()) && !STATUS_PROCESSING.equals(application.getStatus())) {
            throw new BusinessException("Invoice application cannot be issued");
        }
        return updateStatus(application, STATUS_ISSUED, request, true);
    }

    @Transactional
    public InvoiceApplicationResponse reject(Long id, InvoiceApplicationStatusRequest request) {
        TenantInvoiceApplication application = requireApplication(id);
        if (STATUS_ISSUED.equals(application.getStatus()) || STATUS_REJECTED.equals(application.getStatus())) {
            throw new BusinessException("Invoice application cannot be rejected");
        }
        return updateStatus(application, STATUS_REJECTED, request, false);
    }

    private TenantInvoiceApplication requireApplication(Long id) {
        TenantInvoiceApplication application = invoiceApplicationMapper.selectById(id);
        if (application == null) {
            throw new NotFoundException("Invoice application not found");
        }
        return application;
    }

    private InvoiceApplicationResponse updateStatus(
        TenantInvoiceApplication application,
        String status,
        InvoiceApplicationStatusRequest request,
        boolean issued
    ) {
        LocalDateTime now = LocalDateTime.now();
        application.setStatus(status);
        if (issued) {
            application.setIssuedAt(now);
        }
        if (request != null && StringUtils.hasText(request.getRemark())) {
            application.setRemark(request.getRemark());
        }
        application.setUpdatedAt(now);
        invoiceApplicationMapper.updateById(application);
        return toResponse(application);
    }

    private InvoiceApplicationResponse toResponse(TenantInvoiceApplication application) {
        return new InvoiceApplicationResponse(
            application.getId(),
            application.getTenantId(),
            application.getInvoiceTitle(),
            application.getTaxNo(),
            application.getAmountCny(),
            application.getInvoiceType(),
            application.getStatus(),
            application.getEmail(),
            application.getAppliedAt(),
            application.getIssuedAt(),
            application.getRemark(),
            application.getCreatedAt(),
            application.getUpdatedAt()
        );
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return 100;
        }
        return Math.max(1, Math.min(limit, 500));
    }
}
