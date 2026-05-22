package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.CostMetricResponse;
import com.yeho.ai.platform.dto.gateway.CostSummaryResponse;
import com.yeho.ai.platform.service.CostAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics/costs")
@RequiredArgsConstructor
public class CostAnalyticsController {

    private final CostAnalyticsService costAnalyticsService;

    @GetMapping("/summary")
    public ApiResponse<CostSummaryResponse> summary(@RequestParam(required = false) Integer days) {
        return ApiResponse.ok(costAnalyticsService.summary(days));
    }

    @GetMapping("/providers")
    public ApiResponse<List<CostMetricResponse>> providers(@RequestParam(required = false) Integer days) {
        return ApiResponse.ok(costAnalyticsService.providerCosts(days));
    }
}
