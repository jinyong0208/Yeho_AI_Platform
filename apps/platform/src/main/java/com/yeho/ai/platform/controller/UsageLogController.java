package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.gateway.UsageLogResponse;
import com.yeho.ai.platform.dto.gateway.UsageSummaryResponse;
import com.yeho.ai.platform.service.UsageQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class UsageLogController {
    private final UsageQueryService usageQueryService;

    @GetMapping("/usage-logs")
    public ApiResponse<List<UsageLogResponse>> logs(
        @RequestParam(required = false) Long tenantId,
        @RequestParam(required = false) Long apiKeyId,
        @RequestParam(required = false) String providerCode,
        @RequestParam(required = false) String modelCode,
        @RequestParam(required = false) Boolean success,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
        @RequestParam(required = false) Integer limit
    ) {
        return ApiResponse.ok(usageQueryService.list(
            tenantId,
            apiKeyId,
            providerCode,
            modelCode,
            success,
            from,
            to,
            limit
        ));
    }

    @GetMapping("/usage-stats/summary")
    public ApiResponse<UsageSummaryResponse> summary(
        @RequestParam(required = false) Long tenantId,
        @RequestParam(required = false) Long apiKeyId,
        @RequestParam(required = false) String providerCode,
        @RequestParam(required = false) String modelCode,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return ApiResponse.ok(usageQueryService.summary(
            tenantId,
            apiKeyId,
            providerCode,
            modelCode,
            from,
            to
        ));
    }
}
