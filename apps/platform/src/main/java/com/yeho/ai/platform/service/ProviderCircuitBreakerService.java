package com.yeho.ai.platform.service;

import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.AiProviderMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class ProviderCircuitBreakerService {
    private final AiProviderMapper aiProviderMapper;

    public <T> T execute(AiProvider provider, Supplier<T> action) {
        ensureCircuitClosed(provider);
        int attempts = Math.max(0, value(provider.getRetryCount(), 0)) + 1;
        RuntimeException lastError = null;
        for (int i = 0; i < attempts; i++) {
            try {
                T result = action.get();
                recordSuccess(provider);
                return result;
            } catch (RuntimeException ex) {
                lastError = ex;
                if (i == attempts - 1) {
                    recordFailure(provider);
                }
            }
        }
        throw lastError == null
            ? new GatewayException(HttpStatus.BAD_GATEWAY, "provider_error", "Provider call failed")
            : lastError;
    }

    public void ensureCircuitClosed(AiProvider provider) {
        LocalDateTime now = LocalDateTime.now();
        if (provider.getCircuitOpenUntil() != null && provider.getCircuitOpenUntil().isAfter(now)) {
            throw new GatewayException(HttpStatus.SERVICE_UNAVAILABLE, "provider_circuit_open", "Provider circuit is open");
        }
    }

    public void recordSuccess(AiProvider provider) {
        provider.setConsecutiveFailures(0);
        provider.setCircuitOpenUntil(null);
        provider.setHealthStatus("HEALTHY");
        provider.setLastCheckedAt(LocalDateTime.now());
        provider.setUpdatedAt(LocalDateTime.now());
        aiProviderMapper.updateById(provider);
    }

    public void recordFailure(AiProvider provider) {
        int failures = value(provider.getConsecutiveFailures(), 0) + 1;
        int threshold = Math.max(1, value(provider.getCircuitFailureThreshold(), 5));
        provider.setConsecutiveFailures(failures);
        provider.setHealthStatus(failures >= threshold ? "CIRCUIT_OPEN" : "DEGRADED");
        if (failures >= threshold) {
            provider.setCircuitOpenUntil(LocalDateTime.now().plusSeconds(Math.max(1, value(provider.getCircuitCooldownSeconds(), 60))));
        }
        provider.setLastCheckedAt(LocalDateTime.now());
        provider.setUpdatedAt(LocalDateTime.now());
        aiProviderMapper.updateById(provider);
    }

    private int value(Integer value, int fallback) {
        return value == null ? fallback : value;
    }
}
