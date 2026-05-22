package com.yeho.ai.platform.service;

import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.AiProviderMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ProviderCircuitBreakerServiceTest {

    @Mock
    private AiProviderMapper aiProviderMapper;

    @InjectMocks
    private ProviderCircuitBreakerService service;

    @Test
    void executeRetriesAndRecordsSuccess() {
        AiProvider provider = provider(1L);
        provider.setRetryCount(1);
        AtomicInteger calls = new AtomicInteger();

        String result = service.execute(provider, () -> {
            if (calls.incrementAndGet() == 1) {
                throw new IllegalStateException("temporary");
            }
            return "ok";
        });

        assertThat(result).isEqualTo("ok");
        assertThat(calls).hasValue(2);
        assertThat(provider.getHealthStatus()).isEqualTo("HEALTHY");
        assertThat(provider.getConsecutiveFailures()).isZero();
        assertThat(provider.getCircuitOpenUntil()).isNull();
        verify(aiProviderMapper).updateById(provider);
    }

    @Test
    void executeRecordsFailureAndOpensCircuitAtThreshold() {
        AiProvider provider = provider(1L);
        provider.setRetryCount(0);
        provider.setConsecutiveFailures(1);
        provider.setCircuitFailureThreshold(2);
        provider.setCircuitCooldownSeconds(30);

        assertThatThrownBy(() -> service.execute(provider, () -> {
            throw new IllegalStateException("provider down");
        }))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("provider down");

        assertThat(provider.getConsecutiveFailures()).isEqualTo(2);
        assertThat(provider.getHealthStatus()).isEqualTo("CIRCUIT_OPEN");
        assertThat(provider.getCircuitOpenUntil()).isAfter(LocalDateTime.now());
        verify(aiProviderMapper).updateById(provider);
    }

    @Test
    void ensureCircuitClosedRejectsProviderStillCoolingDown() {
        AiProvider provider = provider(1L);
        provider.setCircuitOpenUntil(LocalDateTime.now().plusMinutes(1));

        assertThatThrownBy(() -> service.ensureCircuitClosed(provider))
            .isInstanceOfSatisfying(GatewayException.class, ex -> {
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                assertThat(ex.getCode()).isEqualTo("provider_circuit_open");
            });

        verify(aiProviderMapper, never()).updateById(provider);
    }

    @Test
    void recordSuccessClearsPreviousFailureState() {
        AiProvider provider = provider(1L);
        provider.setConsecutiveFailures(4);
        provider.setHealthStatus("CIRCUIT_OPEN");
        provider.setCircuitOpenUntil(LocalDateTime.now().plusMinutes(1));

        service.recordSuccess(provider);

        ArgumentCaptor<AiProvider> providerCaptor = ArgumentCaptor.forClass(AiProvider.class);
        verify(aiProviderMapper).updateById(providerCaptor.capture());
        assertThat(providerCaptor.getValue().getHealthStatus()).isEqualTo("HEALTHY");
        assertThat(providerCaptor.getValue().getConsecutiveFailures()).isZero();
        assertThat(providerCaptor.getValue().getCircuitOpenUntil()).isNull();
    }

    private AiProvider provider(Long id) {
        AiProvider provider = new AiProvider();
        provider.setId(id);
        provider.setProviderCode("QWEN");
        provider.setStatus("ACTIVE");
        provider.setConsecutiveFailures(0);
        provider.setCircuitFailureThreshold(5);
        provider.setCircuitCooldownSeconds(60);
        return provider;
    }
}
