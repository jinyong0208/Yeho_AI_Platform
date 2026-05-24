package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.service.ApiKeyLifecycleService;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/api-keys")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','DEVELOPER')")
public class ApiKeyLifecycleController {

    private final ApiKeyLifecycleService apiKeyLifecycleService;

    public ApiKeyLifecycleController(ApiKeyLifecycleService apiKeyLifecycleService) {
        this.apiKeyLifecycleService = apiKeyLifecycleService;
    }

    @PostMapping("/{apiKeyId}/disable")
    public Map<String, Object> disable(@PathVariable Long apiKeyId) {
        return apiKeyLifecycleService.disable(apiKeyId);
    }

    @PostMapping("/{apiKeyId}/enable")
    public Map<String, Object> enable(@PathVariable Long apiKeyId) {
        return apiKeyLifecycleService.enable(apiKeyId);
    }

    @GetMapping("/{apiKeyId}/usage-summary")
    public Map<String, Object> usageSummary(
            @PathVariable Long apiKeyId,
            @RequestParam(required = false) Integer days
    ) {
        return apiKeyLifecycleService.usageSummary(apiKeyId, days);
    }
}
