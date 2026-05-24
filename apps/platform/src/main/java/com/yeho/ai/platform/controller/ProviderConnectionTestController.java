package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.service.ProviderConnectionTestService;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/providers")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class ProviderConnectionTestController {

    private final ProviderConnectionTestService providerConnectionTestService;

    public ProviderConnectionTestController(ProviderConnectionTestService providerConnectionTestService) {
        this.providerConnectionTestService = providerConnectionTestService;
    }

    @PostMapping("/{providerId}/test")
    public Map<String, Object> testProvider(@PathVariable Long providerId) {
        return providerConnectionTestService.testProvider(providerId);
    }

    @GetMapping("/health")
    public List<Map<String, Object>> listHealth() {
        return providerConnectionTestService.listHealth();
    }

    @GetMapping("/{providerId}/test-logs")
    public List<Map<String, Object>> listRecentTests(@PathVariable Long providerId) {
        return providerConnectionTestService.listRecentTests(providerId);
    }
}
