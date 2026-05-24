package com.yeho.ai.platform.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.common.RequestContext;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatCompletionResponse;
import com.yeho.ai.platform.dto.openai.ChatMessage;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.gateway.ModelRoute;
import com.yeho.ai.platform.gateway.ModelRouter;
import com.yeho.ai.platform.gateway.adapter.AdapterChatRequest;
import com.yeho.ai.platform.gateway.adapter.AdapterChatResponse;
import com.yeho.ai.platform.gateway.adapter.AiProviderAdapter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiGatewayServiceTest {

    @Mock
    private AiApiKeyService aiApiKeyService;

    @Mock
    private ApiKeyScopeService apiKeyScopeService;

    @Mock
    private RateLimitService rateLimitService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private ProviderCircuitBreakerService providerCircuitBreakerService;

    @Mock
    private AiWalletService aiWalletService;

    @Mock
    private AiUsageLogService aiUsageLogService;

    @Mock
    private ModelRouter modelRouter;

    @Mock
    private AiProviderAdapter primaryAdapter;

    @Mock
    private AiProviderAdapter fallbackAdapter;

    @AfterEach
    void tearDown() {
        RequestContext.clear();
    }

    @Test
    void chatCompletionsUsesFallbackRouteForBillingUsageAndResponse() {
        RequestContext.setRequestId("req-fallback");
        AiGatewayService service = new AiGatewayService(
            aiApiKeyService,
            apiKeyScopeService,
            rateLimitService,
            auditLogService,
            providerCircuitBreakerService,
            aiWalletService,
            aiUsageLogService,
            modelRouter,
            new ObjectMapper()
        );

        TenantApiKey apiKey = new TenantApiKey();
        apiKey.setId(10L);
        apiKey.setTenantId(1L);
        apiKey.setScopes("chat:completion");

        AiProvider primaryProvider = provider(100L, "QWEN", "fallback-model");
        AiModel primaryModel = model(200L, 100L, "primary-model", 1001L);
        ModelRoute primaryRoute = new ModelRoute(primaryProvider, primaryModel, primaryAdapter, "primary-secret");

        AiProvider fallbackProvider = provider(101L, "DEEPSEEK", null);
        AiModel fallbackModel = model(201L, 101L, "fallback-model", 1002L);
        ModelRoute fallbackRoute = new ModelRoute(fallbackProvider, fallbackModel, fallbackAdapter, "fallback-secret");

        ChatCompletionRequest request = chatRequest("primary-model");
        RateLimitService.RateLimitLease lease = new RateLimitService.RateLimitLease(1L, 10L, 18, 100L);
        AdapterChatResponse fallbackResponse = new AdapterChatResponse("fallback pong", 3, 4, 7, "stop");

        when(aiApiKeyService.authenticate("Bearer yh_test")).thenReturn(apiKey);
        when(modelRouter.route("primary-model")).thenReturn(primaryRoute);
        when(modelRouter.route("fallback-model")).thenReturn(fallbackRoute);
        when(aiWalletService.estimateChargeCredits(primaryModel, request)).thenReturn(100L);
        when(aiWalletService.estimatePromptTokens(request.getMessages())).thenReturn(2);
        when(rateLimitService.acquire(apiKey, 18, 100L, "req-fallback")).thenReturn(lease);
        doAnswer(invocation -> {
            AiProvider provider = invocation.getArgument(0);
            Supplier<AdapterChatResponse> action = invocation.getArgument(1);
            if (provider == primaryProvider) {
                throw new GatewayException(HttpStatus.SERVICE_UNAVAILABLE, "provider_circuit_open", "Provider circuit is open");
            }
            if (provider == fallbackProvider) {
                return action.get();
            }
            throw new AssertionError("Unexpected provider: " + provider.getProviderCode());
        }).when(providerCircuitBreakerService).execute(any(AiProvider.class), any());
        when(fallbackAdapter.chat(any(AdapterChatRequest.class))).thenReturn(fallbackResponse);
        when(aiWalletService.calculateChargeCredits(fallbackModel, 3, 4)).thenReturn(22L);

        ChatCompletionResponse response = service.chatCompletions(request, "Bearer yh_test");

        assertThat(response.model()).isEqualTo("fallback-model");
        assertThat(response.choices().get(0).message().getContent()).isEqualTo("fallback pong");
        verify(aiWalletService).settle(1L, 100L, 22L, "req-fallback");
        verify(rateLimitService).releaseDailyCredits(lease, 78L);
        verify(rateLimitService).releaseConcurrent(lease);
        verify(fallbackAdapter).chat(any(AdapterChatRequest.class));
        verify(aiUsageLogService).record(
            eq(1L),
            isNull(),
            eq(10L),
            eq("DEEPSEEK"),
            eq("fallback-model"),
            eq("req-fallback"),
            eq(3),
            eq(4),
            eq(7),
            eq(22L),
            eq(fallbackModel),
            anyLong(),
            eq(true),
            isNull(),
            isNull(),
            eq(request),
            eq("chat:completion"),
            eq(GatewayRequestContext.empty())
        );
    }

    @Test
    void chatCompletionsDoesNotReleaseWalletWhenRateLimitRejectsBeforeReserve() {
        RequestContext.setRequestId("req-rate-limit");
        AiGatewayService service = new AiGatewayService(
            aiApiKeyService,
            apiKeyScopeService,
            rateLimitService,
            auditLogService,
            providerCircuitBreakerService,
            aiWalletService,
            aiUsageLogService,
            modelRouter,
            new ObjectMapper()
        );

        TenantApiKey apiKey = new TenantApiKey();
        apiKey.setId(10L);
        apiKey.setTenantId(1L);
        apiKey.setScopes("chat:completion");

        AiProvider provider = provider(100L, "DEEPSEEK", null);
        AiModel model = model(200L, 100L, "deepseek-chat", 1001L);
        ModelRoute route = new ModelRoute(provider, model, primaryAdapter, "provider-secret");
        ChatCompletionRequest request = chatRequest("deepseek-chat");
        GatewayException rateLimit = new GatewayException(
            HttpStatus.TOO_MANY_REQUESTS,
            "rate_limit_rpm_exceeded",
            "Rate limit exceeded"
        );

        when(aiApiKeyService.authenticate("Bearer yh_test")).thenReturn(apiKey);
        when(modelRouter.route("deepseek-chat")).thenReturn(route);
        when(aiWalletService.estimateChargeCredits(model, request)).thenReturn(100L);
        when(aiWalletService.estimatePromptTokens(request.getMessages())).thenReturn(2);
        when(rateLimitService.acquire(apiKey, 18, 100L, "req-rate-limit")).thenThrow(rateLimit);

        assertThatThrownBy(() -> service.chatCompletions(request, "Bearer yh_test"))
            .isSameAs(rateLimit);

        verify(aiWalletService, never()).reserve(anyLong(), anyLong(), any());
        verify(aiWalletService, never()).release(anyLong(), anyLong(), any(), any());
        verify(aiUsageLogService).record(
            eq(1L),
            isNull(),
            eq(10L),
            eq("DEEPSEEK"),
            eq("deepseek-chat"),
            eq("req-rate-limit"),
            eq(0),
            eq(0),
            eq(0),
            eq(0L),
            eq(model),
            anyLong(),
            eq(false),
            eq("rate_limit_rpm_exceeded"),
            eq("Rate limit exceeded"),
            eq(request),
            eq("chat:completion"),
            eq(GatewayRequestContext.empty())
        );
    }

    private ChatCompletionRequest chatRequest(String modelCode) {
        ChatMessage message = new ChatMessage();
        message.setRole("user");
        message.setContent("ping");

        ChatCompletionRequest request = new ChatCompletionRequest();
        request.setModel(modelCode);
        request.setMessages(List.of(message));
        request.setTemperature(BigDecimal.valueOf(0.2));
        request.setMaxTokens(16);
        request.setStream(false);
        return request;
    }

    private AiProvider provider(Long id, String providerCode, String fallbackModelCode) {
        AiProvider provider = new AiProvider();
        provider.setId(id);
        provider.setProviderCode(providerCode);
        provider.setProviderName(providerCode);
        provider.setBaseUrl("https://example.test/v1");
        provider.setStatus("ACTIVE");
        provider.setFallbackModelCode(fallbackModelCode);
        return provider;
    }

    private AiModel model(Long id, Long providerId, String modelCode, Long priceVersionId) {
        AiModel model = new AiModel();
        model.setId(id);
        model.setProviderId(providerId);
        model.setModelCode(modelCode);
        model.setDisplayName(modelCode);
        model.setCurrentPriceVersionId(priceVersionId);
        model.setInputCreditRate(BigDecimal.ONE);
        model.setOutputCreditRate(BigDecimal.ONE);
        model.setBillingMultiplier(BigDecimal.ONE);
        model.setInputPrice(BigDecimal.ZERO);
        model.setOutputPrice(BigDecimal.ZERO);
        model.setStatus("ACTIVE");
        return model;
    }
}
