package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.RechargeOrderCreateRequest;
import com.yeho.ai.platform.dto.gateway.RechargeOrderResponse;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.RechargeOrderService;
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
@RequestMapping("/api/v1/recharge-orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','FINANCE')")
public class RechargeOrderController {
    private final RechargeOrderService rechargeOrderService;
    private final TenantAccessService tenantAccessService;

    @PostMapping
    public ApiResponse<RechargeOrderResponse> create(
        @AuthenticationPrincipal AuthenticatedUser user,
        @Valid @RequestBody RechargeOrderCreateRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, request.getTenantId());
        return ApiResponse.ok(rechargeOrderService.create(request));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','FINANCE')")
    public ApiResponse<RechargeOrderResponse> confirm(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, rechargeOrderService.get(id).tenantId());
        return ApiResponse.ok(rechargeOrderService.confirm(id));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','FINANCE')")
    public ApiResponse<RechargeOrderResponse> close(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long id
    ) {
        tenantAccessService.assertTenantAccess(user, rechargeOrderService.get(id).tenantId());
        return ApiResponse.ok(rechargeOrderService.close(id));
    }

    @GetMapping("/{id}")
    public ApiResponse<RechargeOrderResponse> get(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long id
    ) {
        RechargeOrderResponse response = rechargeOrderService.get(id);
        tenantAccessService.assertTenantAccess(user, response.tenantId());
        return ApiResponse.ok(response);
    }

    @GetMapping
    public ApiResponse<List<RechargeOrderResponse>> list(
        @AuthenticationPrincipal AuthenticatedUser user,
        @RequestParam(required = false) Long tenantId,
        @RequestParam(required = false) Integer limit
    ) {
        return ApiResponse.ok(rechargeOrderService.list(tenantAccessService.scopeTenantId(user, tenantId), limit));
    }
}
