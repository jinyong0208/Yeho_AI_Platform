package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.WalletLogResponse;
import com.yeho.ai.platform.dto.gateway.WalletRechargeRequest;
import com.yeho.ai.platform.dto.gateway.WalletResponse;
import com.yeho.ai.platform.entity.TenantWallet;
import com.yeho.ai.platform.service.AiWalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
public class WalletController {
    private final AiWalletService aiWalletService;

    @GetMapping("/{tenantId}")
    public ApiResponse<WalletResponse> get(@PathVariable Long tenantId) {
        return ApiResponse.ok(toResponse(aiWalletService.ensureWallet(tenantId)));
    }

    @PostMapping("/{tenantId}/recharge")
    public ApiResponse<WalletResponse> recharge(
        @PathVariable Long tenantId,
        @Valid @RequestBody WalletRechargeRequest request
    ) {
        return ApiResponse.ok(toResponse(aiWalletService.recharge(
            tenantId,
            request.getAmountCredits(),
            null,
            request.getRemark()
        )));
    }

    @GetMapping("/{tenantId}/logs")
    public ApiResponse<List<WalletLogResponse>> logs(
        @PathVariable Long tenantId,
        @RequestParam(required = false) Integer limit
    ) {
        return ApiResponse.ok(aiWalletService.listLogs(tenantId, limit));
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
