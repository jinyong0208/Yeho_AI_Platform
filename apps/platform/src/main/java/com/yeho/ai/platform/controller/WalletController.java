package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.WalletLogResponse;
import com.yeho.ai.platform.dto.gateway.WalletRechargeRequest;
import com.yeho.ai.platform.dto.gateway.WalletResponse;
import com.yeho.ai.platform.entity.TenantWallet;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.AiWalletService;
import com.yeho.ai.platform.service.TenantAccessService;
import com.yeho.ai.platform.service.WalletAlertService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','FINANCE')")
public class WalletController {
    private final AiWalletService aiWalletService;
    private final TenantAccessService tenantAccessService;
    private final WalletAlertService walletAlertService;

    @GetMapping("/{tenantId}")
    public ApiResponse<WalletResponse> get(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(toResponse(aiWalletService.ensureWallet(tenantId)));
    }

    @PostMapping("/{tenantId}/recharge")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','FINANCE')")
    public ApiResponse<WalletResponse> recharge(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @Valid @RequestBody WalletRechargeRequest request
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(toResponse(aiWalletService.recharge(
            tenantId,
            request.getAmountCredits(),
            null,
            request.getRemark()
        )));
    }

    @GetMapping("/{tenantId}/logs")
    public ApiResponse<List<WalletLogResponse>> logs(
        @AuthenticationPrincipal AuthenticatedUser user,
        @PathVariable Long tenantId,
        @RequestParam(required = false) Integer limit
    ) {
        tenantAccessService.assertTenantAccess(user, tenantId);
        return ApiResponse.ok(aiWalletService.listLogs(tenantId, limit));
    }

    @GetMapping("/alerts/low-balance")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','FINANCE')")
    public ApiResponse<List<Map<String, Object>>> lowBalanceAlerts(
        @AuthenticationPrincipal AuthenticatedUser user,
        @RequestParam(required = false) Long tenantId,
        @RequestParam(required = false) Long thresholdCredits,
        @RequestParam(required = false) Integer limit
    ) {
        Long scopedTenantId = tenantAccessService.scopeTenantId(user, tenantId);
        return ApiResponse.ok(walletAlertService.listLowBalanceWallets(scopedTenantId, thresholdCredits, limit));
    }

    private WalletResponse toResponse(TenantWallet wallet) {
        return new WalletResponse(
            wallet.getTenantId(),
            wallet.getBalanceCredits(),
            wallet.getFrozenCredits(),
            wallet.getTotalRechargeCredits(),
            wallet.getTotalUsedCredits(),
            wallet.getUpdatedAt()
        );
    }
}
