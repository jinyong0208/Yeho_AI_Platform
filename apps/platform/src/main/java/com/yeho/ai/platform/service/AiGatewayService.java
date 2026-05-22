package com.yeho.ai.platform.service;

import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatCompletionResponse;
import com.yeho.ai.platform.dto.openai.ChatMessage;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.gateway.ModelRoute;
import com.yeho.ai.platform.gateway.adapter.AdapterChatRequest;
import com.yeho.ai.platform.gateway.adapter.AdapterChatResponse;
import com.yeho.ai.platform.security.ApiKeyHashService;
import com.yeho.ai.platform.common.RequestContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiGatewayService {
    private final AiApiKeyService aiApiKeyService;
    private final AiWalletService aiWalletService;
    private final AiUsageLogService aiUsageLogService;
    private final com.yeho.ai.platform.gateway.ModelRouter modelRouter;

    public ChatCompletionResponse chatCompletions(ChatCompletionRequest request, String authorizationHeader) {
        long startTime = System.currentTimeMillis();
        String requestId = StringUtils.hasText(RequestContext.getRequestId())
            ? RequestContext.getRequestId()
            : UUID.randomUUID().toString();

        TenantApiKey tenantApiKey = null;
        ModelRoute route = null;
        long reservedCredits = 0L;
        AdapterChatResponse adapterResponse = null;
        int inputTokens = 0;
        int outputTokens = 0;
        int totalTokens = 0;
        Long tenantId = null;
        Long apiKeyId = null;
        String providerCode = null;
        String modelCode = null;
        try {
            validateRequest(request);
            modelCode = request.getModel();

            if (Boolean.TRUE.equals(request.getStream())) {
                throw new GatewayException(HttpStatus.BAD_REQUEST, "stream_not_supported", "stream must be false");
            }

            tenantApiKey = aiApiKeyService.authenticate(authorizationHeader);
            tenantId = tenantApiKey.getTenantId();
            apiKeyId = tenantApiKey.getId();

            route = modelRouter.route(request.getModel());
            providerCode = route.provider().getProviderCode();
            AiModel model = route.model();

            reservedCredits = aiWalletService.estimateChargeCredits(model, request);
            aiWalletService.reserve(tenantId, reservedCredits, requestId);

            adapterResponse = route.adapter().chat(new AdapterChatRequest(
                route.provider().getBaseUrl(),
                route.decryptedApiKey(),
                request.getModel(),
                request.getMessages(),
                request.getTemperature(),
                request.getMaxTokens()
            ));

            inputTokens = adapterResponse.inputTokens() == null
                ? aiWalletService.estimatePromptTokens(request.getMessages())
                : adapterResponse.inputTokens();
            outputTokens = adapterResponse.outputTokens() == null
                ? aiWalletService.estimateCompletionTokens(adapterResponse.content())
                : adapterResponse.outputTokens();
            totalTokens = adapterResponse.totalTokens() == null
                ? inputTokens + outputTokens
                : adapterResponse.totalTokens();

            long actualChargeCredits = aiWalletService.calculateChargeCredits(model, inputTokens, outputTokens);
            aiWalletService.settle(tenantId, reservedCredits, actualChargeCredits, requestId);
            aiUsageLogService.record(
                tenantId,
                null,
                apiKeyId,
                providerCode,
                modelCode,
                requestId,
                inputTokens,
                outputTokens,
                totalTokens,
                actualChargeCredits,
                model,
                System.currentTimeMillis() - startTime,
                true,
                null,
                null,
                request
            );
            return buildResponse(request, route.model(), adapterResponse);
        } catch (GatewayException ex) {
            if (tenantId != null && reservedCredits > 0) {
                aiWalletService.release(tenantId, reservedCredits, requestId, ex.getMessage());
            }
            aiUsageLogService.record(
                tenantId,
                null,
                apiKeyId,
                providerCode,
                modelCode,
                requestId,
                inputTokens,
                outputTokens,
                totalTokens,
                0L,
                route == null ? null : route.model(),
                System.currentTimeMillis() - startTime,
                false,
                ex.getCode(),
                ex.getMessage(),
                request
            );
            throw ex;
        } catch (Exception ex) {
            if (tenantId != null && reservedCredits > 0) {
                aiWalletService.release(tenantId, reservedCredits, requestId, "Rollback failed request");
            }
            aiUsageLogService.record(
                tenantId,
                null,
                apiKeyId,
                providerCode,
                modelCode,
                requestId,
                inputTokens,
                outputTokens,
                totalTokens,
                0L,
                route == null ? null : route.model(),
                System.currentTimeMillis() - startTime,
                false,
                "provider_error",
                ex.getMessage(),
                request
            );
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_error", "Chat completion failed");
        }
    }

    private void validateRequest(ChatCompletionRequest request) {
        if (request == null) {
            throw new GatewayException(HttpStatus.BAD_REQUEST, "invalid_request", "Request body is required");
        }
        if (!StringUtils.hasText(request.getModel())) {
            throw new GatewayException(HttpStatus.BAD_REQUEST, "invalid_request", "model is required");
        }
        if (request.getMessages() == null || request.getMessages().isEmpty()) {
            throw new GatewayException(HttpStatus.BAD_REQUEST, "invalid_request", "messages is required");
        }
        for (int i = 0; i < request.getMessages().size(); i++) {
            ChatMessage message = request.getMessages().get(i);
            if (message == null || !StringUtils.hasText(message.getRole()) || !StringUtils.hasText(message.getContent())) {
                throw new GatewayException(HttpStatus.BAD_REQUEST, "invalid_request", "messages[" + i + "] is invalid");
            }
        }
    }

    private ChatCompletionResponse buildResponse(ChatCompletionRequest request, AiModel model, AdapterChatResponse adapterResponse) {
        String content = adapterResponse.content() == null ? "" : adapterResponse.content();
        ChatMessage message = new ChatMessage();
        message.setRole("assistant");
        message.setContent(content);

        ChatCompletionResponse.Choice choice = new ChatCompletionResponse.Choice(
            0,
            message,
            adapterResponse.finishReason() == null ? "stop" : adapterResponse.finishReason()
        );

        ChatCompletionResponse.Usage usage = new ChatCompletionResponse.Usage(
            adapterResponse.inputTokens(),
            adapterResponse.outputTokens(),
            adapterResponse.totalTokens()
        );

        return new ChatCompletionResponse(
            "chatcmpl-" + UUID.randomUUID().toString().replace("-", ""),
            "chat.completion",
            Instant.now().getEpochSecond(),
            model.getModelCode(),
            List.of(choice),
            usage
        );
    }
}
