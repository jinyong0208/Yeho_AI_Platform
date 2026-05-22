package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.invoice.InvoiceApplicationCreateRequest;
import com.yeho.ai.platform.dto.invoice.InvoiceApplicationResponse;
import com.yeho.ai.platform.dto.invoice.InvoiceApplicationStatusRequest;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.InvoiceApplicationService;
import com.yeho.ai.platform.service.TenantAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/invoice-applications")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','FINANCE')")
public class InvoiceApplicationController {
    private final InvoiceApplicationService invoiceApplicationService;
    private final TenantAccessService tenantAccessService;

    @PostMapping
    public ApiResponse<InvoiceApplicationResponse> create(
        @AuthenticationPrincipal AuthenticatedUser user,
        @Valid @RequestBody InvoiceApplicationCreateRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, request.getTenantId());
        return ApiResponse.ok(invoiceApplicationService.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<InvoiceApplicationResponse> get(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long id
    ) {
        InvoiceApplicationResponse response = invoiceApplicationService.get(id);
        tenantAccessService.assertTenantAccess(user, response.tenantId());
        return ApiResponse.ok(response);
    }

    @GetMapping
    public ApiResponse<List<InvoiceApplicationResponse>> list(
        @AuthenticationPrincipal AuthenticatedUser user,
        @RequestParam(required = false) Long tenantId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Integer limit
    ) {
        return ApiResponse.ok(invoiceApplicationService.list(
            tenantAccessService.scopeTenantId(user, tenantId),
            status,
            limit
        ));
    }

    @PostMapping("/{id}/process")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','FINANCE')")
    public ApiResponse<InvoiceApplicationResponse> process(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long id,
        @RequestBody(required = false) InvoiceApplicationStatusRequest request
    ) {
        InvoiceApplicationResponse response = invoiceApplicationService.get(id);
        tenantAccessService.assertTenantAccess(user, response.tenantId());
        return ApiResponse.ok(invoiceApplicationService.markProcessing(id, request));
    }

    @PostMapping("/{id}/issue")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','FINANCE')")
    public ApiResponse<InvoiceApplicationResponse> issue(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long id,
        @RequestBody(required = false) InvoiceApplicationStatusRequest request
    ) {
        InvoiceApplicationResponse response = invoiceApplicationService.get(id);
        tenantAccessService.assertTenantAccess(user, response.tenantId());
        return ApiResponse.ok(invoiceApplicationService.markIssued(id, request));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','FINANCE')")
    public ApiResponse<InvoiceApplicationResponse> reject(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long id,
        @RequestBody(required = false) InvoiceApplicationStatusRequest request
    ) {
        InvoiceApplicationResponse response = invoiceApplicationService.get(id);
        tenantAccessService.assertTenantAccess(user, response.tenantId());
        return ApiResponse.ok(invoiceApplicationService.reject(id, request));
    }
}
