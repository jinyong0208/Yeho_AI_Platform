package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.RechargeOrderCreateRequest;
import com.yeho.ai.platform.dto.gateway.RechargeOrderResponse;
import com.yeho.ai.platform.service.RechargeOrderService;
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
@RequestMapping("/api/v1/recharge-orders")
@RequiredArgsConstructor
public class RechargeOrderController {
    private final RechargeOrderService rechargeOrderService;

    @PostMapping
    public ApiResponse<RechargeOrderResponse> create(@Valid @RequestBody RechargeOrderCreateRequest request) {
        return ApiResponse.ok(rechargeOrderService.create(request));
    }

    @PostMapping("/{id}/confirm")
    public ApiResponse<RechargeOrderResponse> confirm(@PathVariable Long id) {
        return ApiResponse.ok(rechargeOrderService.confirm(id));
    }

    @GetMapping("/{id}")
    public ApiResponse<RechargeOrderResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(rechargeOrderService.get(id));
    }

    @GetMapping
    public ApiResponse<List<RechargeOrderResponse>> list(
        @RequestParam(required = false) Long tenantId,
        @RequestParam(required = false) Integer limit
    ) {
        return ApiResponse.ok(rechargeOrderService.list(tenantId, limit));
    }
}
