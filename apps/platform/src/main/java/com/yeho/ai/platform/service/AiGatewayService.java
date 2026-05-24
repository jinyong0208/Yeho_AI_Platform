package com.yeho.ai.platform.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatCompletionChunkResponse;
import com.yeho.ai.platform.dto.openai.ChatCompletionResponse;
import com.yeho.ai.platform.dto.openai.ChatMessage;
import com.yeho.ai.platform.dto.openai.OpenAiErrorResponse;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.SysAuditLog;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.gateway.ModelRoute;
import com.yeho.ai.platform.gateway.adapter.AdapterChatRequest;
import com.yeho.ai.platform.gateway.adapter.AdapterChatResponse;
import com.yeho.ai.platform.gateway.adapter.AdapterStreamChunk;
import com.yeho.ai.platform.security.ApiKeyHashService;
import com.yeho.ai.platform.common.RequestContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiGatewayService {
    private final AiApiKeyService aiApiKeyService;
    private final ApiKeyScopeService apiKeyScopeService;
    private final RateLimitService rateLimitService;
    private final AuditLogService auditLogService;
    private final ProviderCircuitBreakerService providerCircuitBreakerService;
    private final AiWalletService aiWalletService;
    private final AiUsageLogService aiUsageLogService;
    private final com.yeho.ai.platform.gateway.ModelRouter modelRouter;
    private final ObjectMapper objectMapper;

    public ChatCompletionResponse chatCompletions(ChatCompletionRequest request, String authorizationHeader) {
        return chatCompletions(request, authorizationHeader, GatewayRequestContext.empty());
    }

    public ChatCompletionResponse chatCompletions(
        ChatCompletionRequest request,
        String authorizationHeader,
        GatewayRequestContext gatewayContext
    ) {
        GatewayRequestContext requestContext = gatewayContext == null ? GatewayRequestContext.empty() : gatewayContext;
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
        RateLimitService.RateLimitLease rateLimitLease = null;
        boolean walletReserved = false;
        try {
            validateRequest(request);
            modelCode = request.getModel();

            if (Boolean.TRUE.equals(request.getStream())) {
                throw new GatewayException(HttpStatus.BAD_REQUEST, "invalid_request", "Use streamChatCompletions for stream requests");
            }

            tenantApiKey = aiApiKeyService.authenticate(authorizationHeader);
            tenantId = tenantApiKey.getTenantId();
            apiKeyId = tenantApiKey.getId();
            apiKeyScopeService.requireScope(tenantApiKey, ApiKeyScopeService.CHAT_COMPLETION);
            apiKeyScopeService.requireBusinessContext(tenantApiKey, requestContext);

            route = modelRouter.route(request.getModel());
            providerCode = route.provider().getProviderCode();
            AiModel model = route.model();

            reservedCredits = aiWalletService.estimateChargeCredits(model, request);
            int estimatedTokens = aiWalletService.estimatePromptTokens(request.getMessages())
                + (request.getMaxTokens() == null ? 512 : request.getMaxTokens());
            rateLimitLease = rateLimitService.acquire(tenantApiKey, estimatedTokens, reservedCredits, requestId);
            aiWalletService.reserve(tenantId, reservedCredits, requestId);
            walletReserved = true;

            ProviderCallResult providerCallResult = callProviderWithFallback(route, request, requestId);
            route = providerCallResult.route();
            providerCode = route.provider().getProviderCode();
            modelCode = route.model().getModelCode();
            model = route.model();
            adapterResponse = providerCallResult.response();

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
            rateLimitService.releaseDailyCredits(rateLimitLease, Math.max(0, reservedCredits - actualChargeCredits));
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
                request,
                tenantApiKey == null ? null : tenantApiKey.getScopes(),
                requestContext
            );
            return buildResponse(request, route.model(), adapterResponse);
        } catch (GatewayException ex) {
            if (walletReserved && tenantId != null && reservedCredits > 0) {
                aiWalletService.release(tenantId, reservedCredits, requestId, ex.getMessage());
                walletReserved = false;
            }
            rateLimitService.releaseDailyCredits(rateLimitLease, reservedCredits);
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
                request,
                tenantApiKey == null ? null : tenantApiKey.getScopes(),
                requestContext
            );
            if (("insufficient_scope".equals(ex.getCode()) || "insufficient_context_scope".equals(ex.getCode())) && tenantApiKey != null) {
                recordGatewayAudit(tenantApiKey, requestId, "API_KEY_SCOPE", 403, ex.getMessage());
            }
            throw ex;
        } catch (Exception ex) {
            if (walletReserved && tenantId != null && reservedCredits > 0) {
                aiWalletService.release(tenantId, reservedCredits, requestId, "Rollback failed request");
                walletReserved = false;
            }
            rateLimitService.releaseDailyCredits(rateLimitLease, reservedCredits);
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
                request,
                tenantApiKey == null ? null : tenantApiKey.getScopes(),
                requestContext
            );
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_error", "Chat completion failed", ex);
        } finally {
            rateLimitService.releaseConcurrent(rateLimitLease);
        }
    }

    public StreamingResponseBody streamChatCompletions(ChatCompletionRequest request, String authorizationHeader) {
        return streamChatCompletions(request, authorizationHeader, GatewayRequestContext.empty());
    }

    public StreamingResponseBody streamChatCompletions(
        ChatCompletionRequest request,
        String authorizationHeader,
        GatewayRequestContext gatewayContext
    ) {
        GatewayRequestContext requestContext = gatewayContext == null ? GatewayRequestContext.empty() : gatewayContext;
        long startTime = System.currentTimeMillis();
        String requestId = StringUtils.hasText(RequestContext.getRequestId())
            ? RequestContext.getRequestId()
            : UUID.randomUUID().toString();

        TenantApiKey tenantApiKey = null;
        ModelRoute route = null;
        long reservedCredits = 0L;
        Long tenantId = null;
        Long apiKeyId = null;
        String providerCode = null;
        String modelCode = null;
        RateLimitService.RateLimitLease rateLimitLease = null;
        boolean walletReserved = false;
        try {
            validateRequest(request);
            modelCode = request.getModel();

            tenantApiKey = aiApiKeyService.authenticate(authorizationHeader);
            tenantId = tenantApiKey.getTenantId();
            apiKeyId = tenantApiKey.getId();
            apiKeyScopeService.requireScope(tenantApiKey, ApiKeyScopeService.CHAT_COMPLETION);
            apiKeyScopeService.requireBusinessContext(tenantApiKey, requestContext);

            route = modelRouter.route(request.getModel());
            providerCode = route.provider().getProviderCode();
            AiModel model = route.model();
            if (!Boolean.TRUE.equals(model.getSupportStream())) {
                throw new GatewayException(HttpStatus.BAD_REQUEST, "stream_not_supported", "model does not support stream");
            }

            reservedCredits = aiWalletService.estimateChargeCredits(model, request);
            int estimatedTokens = aiWalletService.estimatePromptTokens(request.getMessages())
                + (request.getMaxTokens() == null ? 512 : request.getMaxTokens());
            rateLimitLease = rateLimitService.acquire(tenantApiKey, estimatedTokens, reservedCredits, requestId);
            aiWalletService.reserve(tenantId, reservedCredits, requestId);
            walletReserved = true;

            AdapterChatRequest adapterRequest = new AdapterChatRequest(
                route.provider().getBaseUrl(),
                route.decryptedApiKey(),
                request.getModel(),
                request.getMessages(),
                request.getTemperature(),
                request.getMaxTokens()
            );
            StreamContext context = new StreamContext(
                startTime,
                requestId,
                request,
                route,
                adapterRequest,
                tenantId,
                apiKeyId,
                providerCode,
                modelCode,
                reservedCredits,
                rateLimitLease,
                tenantApiKey.getScopes(),
                requestContext
            );
            return outputStream -> writeStreamingResponse(context, outputStream);
        } catch (GatewayException ex) {
            if (walletReserved && tenantId != null && reservedCredits > 0) {
                aiWalletService.release(tenantId, reservedCredits, requestId, ex.getMessage());
                walletReserved = false;
            }
            rateLimitService.releaseDailyCredits(rateLimitLease, reservedCredits);
            rateLimitService.releaseConcurrent(rateLimitLease);
            aiUsageLogService.record(
                tenantId,
                null,
                apiKeyId,
                providerCode,
                modelCode,
                requestId,
                0,
                0,
                0,
                0L,
                route == null ? null : route.model(),
                System.currentTimeMillis() - startTime,
                false,
                ex.getCode(),
                ex.getMessage(),
                request,
                tenantApiKey == null ? null : tenantApiKey.getScopes(),
                requestContext
            );
            if (("insufficient_scope".equals(ex.getCode()) || "insufficient_context_scope".equals(ex.getCode())) && tenantApiKey != null) {
                recordGatewayAudit(tenantApiKey, requestId, "API_KEY_SCOPE", 403, ex.getMessage());
            }
            throw ex;
        } catch (Exception ex) {
            if (walletReserved && tenantId != null && reservedCredits > 0) {
                aiWalletService.release(tenantId, reservedCredits, requestId, "Rollback failed stream request");
                walletReserved = false;
            }
            rateLimitService.releaseDailyCredits(rateLimitLease, reservedCredits);
            rateLimitService.releaseConcurrent(rateLimitLease);
            aiUsageLogService.record(
                tenantId,
                null,
                apiKeyId,
                providerCode,
                modelCode,
                requestId,
                0,
                0,
                0,
                0L,
                route == null ? null : route.model(),
                System.currentTimeMillis() - startTime,
                false,
                "provider_error",
                ex.getMessage(),
                request,
                tenantApiKey == null ? null : tenantApiKey.getScopes(),
                requestContext
            );
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_error", "Chat completion stream failed", ex);
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

    private void writeStreamingResponse(StreamContext context, OutputStream outputStream) throws IOException {
        String completionId = "chatcmpl-" + UUID.randomUUID().toString().replace("-", "");
        long created = Instant.now().getEpochSecond();
        StreamUsage usage = new StreamUsage();
        StringBuilder completion = new StringBuilder();
        boolean settled = false;

        try {
            writeChunk(outputStream, completionId, created, context.modelCode(), "assistant", null, null);
            providerCircuitBreakerService.ensureCircuitClosed(context.route().provider());
            context.route().adapter().streamChat(context.adapterRequest(), chunk -> {
                applyUsage(usage, chunk);
                if (chunk.contentDelta() != null && !chunk.contentDelta().isEmpty()) {
                    completion.append(chunk.contentDelta());
                    writeChunk(outputStream, completionId, created, context.modelCode(), null, chunk.contentDelta(), null);
                }
                if (StringUtils.hasText(chunk.finishReason())) {
                    usage.finishReason = chunk.finishReason();
                }
            });

            int inputTokens = usage.inputTokens == null
                ? aiWalletService.estimatePromptTokens(context.request().getMessages())
                : usage.inputTokens;
            int outputTokens = usage.outputTokens == null
                ? aiWalletService.estimateCompletionTokens(completion.toString())
                : usage.outputTokens;
            int totalTokens = usage.totalTokens == null ? inputTokens + outputTokens : usage.totalTokens;
            long actualChargeCredits = aiWalletService.calculateChargeCredits(
                context.route().model(),
                inputTokens,
                outputTokens
            );
            aiWalletService.settle(context.tenantId(), context.reservedCredits(), actualChargeCredits, context.requestId());
            providerCircuitBreakerService.recordSuccess(context.route().provider());
            rateLimitService.releaseDailyCredits(context.rateLimitLease(), Math.max(0, context.reservedCredits() - actualChargeCredits));
            settled = true;
            aiUsageLogService.record(
                context.tenantId(),
                null,
                context.apiKeyId(),
                context.providerCode(),
                context.modelCode(),
                context.requestId(),
                inputTokens,
                outputTokens,
                totalTokens,
                actualChargeCredits,
                context.route().model(),
                System.currentTimeMillis() - context.startTime(),
                true,
                null,
                null,
                context.request(),
                context.apiKeyScopes(),
                context.gatewayRequestContext()
            );
            writeChunk(outputStream, completionId, created, context.modelCode(), null, null, usage.finishReason);
            writeDone(outputStream);
        } catch (Exception ex) {
            if (!settled) {
                aiWalletService.release(context.tenantId(), context.reservedCredits(), context.requestId(), "Rollback failed stream request");
                rateLimitService.releaseDailyCredits(context.rateLimitLease(), context.reservedCredits());
            }
            int inputTokens = usage.inputTokens == null
                ? aiWalletService.estimatePromptTokens(context.request().getMessages())
                : usage.inputTokens;
            int outputTokens = usage.outputTokens == null
                ? aiWalletService.estimateCompletionTokens(completion.toString())
                : usage.outputTokens;
            int totalTokens = usage.totalTokens == null ? inputTokens + outputTokens : usage.totalTokens;
            String code = ex instanceof GatewayException gatewayException ? gatewayException.getCode() : "provider_error";
            providerCircuitBreakerService.recordFailure(context.route().provider());
            aiUsageLogService.record(
                context.tenantId(),
                null,
                context.apiKeyId(),
                context.providerCode(),
                context.modelCode(),
                context.requestId(),
                inputTokens,
                outputTokens,
                totalTokens,
                0L,
                context.route().model(),
                System.currentTimeMillis() - context.startTime(),
                false,
                code,
                ex.getMessage(),
                context.request(),
                context.apiKeyScopes(),
                context.gatewayRequestContext()
            );
            writeStreamError(outputStream, code, ex.getMessage());
        } finally {
            rateLimitService.releaseConcurrent(context.rateLimitLease());
        }
    }

    private void applyUsage(StreamUsage usage, AdapterStreamChunk chunk) {
        if (chunk.inputTokens() != null) {
            usage.inputTokens = chunk.inputTokens();
        }
        if (chunk.outputTokens() != null) {
            usage.outputTokens = chunk.outputTokens();
        }
        if (chunk.totalTokens() != null) {
            usage.totalTokens = chunk.totalTokens();
        }
    }

    private void writeChunk(
        OutputStream outputStream,
        String completionId,
        long created,
        String modelCode,
        String role,
        String content,
        String finishReason
    ) throws IOException {
        ChatCompletionChunkResponse chunk = new ChatCompletionChunkResponse(
            completionId,
            "chat.completion.chunk",
            created,
            modelCode,
            List.of(new ChatCompletionChunkResponse.Choice(
                0,
                new ChatCompletionChunkResponse.Delta(role, content),
                finishReason
            ))
        );
        writeSseData(outputStream, chunk);
    }

    private void writeStreamError(OutputStream outputStream, String code, String message) throws IOException {
        OpenAiErrorResponse response = new OpenAiErrorResponse(
            new OpenAiErrorResponse.OpenAiError(
                StringUtils.hasText(message) ? message : "Chat completion stream failed",
                "server_error",
                StringUtils.hasText(code) ? code : "provider_error"
            )
        );
        writeSseData(outputStream, response);
        writeDone(outputStream);
    }

    private void writeSseData(OutputStream outputStream, Object body) throws IOException {
        outputStream.write(("data: " + objectMapper.writeValueAsString(body) + "\n\n").getBytes(StandardCharsets.UTF_8));
        outputStream.flush();
    }

    private void writeDone(OutputStream outputStream) throws IOException {
        outputStream.write("data: [DONE]\n\n".getBytes(StandardCharsets.UTF_8));
        outputStream.flush();
    }

    private record StreamContext(
        long startTime,
        String requestId,
        ChatCompletionRequest request,
        ModelRoute route,
        AdapterChatRequest adapterRequest,
        Long tenantId,
        Long apiKeyId,
        String providerCode,
        String modelCode,
        long reservedCredits,
        RateLimitService.RateLimitLease rateLimitLease,
        String apiKeyScopes,
        GatewayRequestContext gatewayRequestContext
    ) {
    }

    private static class StreamUsage {
        private Integer inputTokens;
        private Integer outputTokens;
        private Integer totalTokens;
        private String finishReason = "stop";
    }

    private ProviderCallResult callProviderWithFallback(ModelRoute route, ChatCompletionRequest request, String requestId) {
        try {
            AdapterChatResponse response = providerCircuitBreakerService.execute(route.provider(), () -> route.adapter().chat(new AdapterChatRequest(
                route.provider().getBaseUrl(),
                route.decryptedApiKey(),
                request.getModel(),
                request.getMessages(),
                request.getTemperature(),
                request.getMaxTokens()
            )));
            return new ProviderCallResult(route, response);
        } catch (GatewayException ex) {
            if (!StringUtils.hasText(route.provider().getFallbackModelCode())) {
                throw ex;
            }
            ModelRoute fallbackRoute = modelRouter.route(route.provider().getFallbackModelCode());
            AdapterChatResponse fallbackResponse = providerCircuitBreakerService.execute(fallbackRoute.provider(), () -> fallbackRoute.adapter().chat(new AdapterChatRequest(
                fallbackRoute.provider().getBaseUrl(),
                fallbackRoute.decryptedApiKey(),
                fallbackRoute.model().getModelCode(),
                request.getMessages(),
                request.getTemperature(),
                request.getMaxTokens()
            )));
            return new ProviderCallResult(fallbackRoute, fallbackResponse);
        }
    }

    private record ProviderCallResult(ModelRoute route, AdapterChatResponse response) {
    }

    private void recordGatewayAudit(TenantApiKey apiKey, String requestId, String action, int statusCode, String message) {
        SysAuditLog log = new SysAuditLog();
        log.setTenantId(apiKey.getTenantId());
        log.setRequestId(requestId);
        log.setAction(action);
        log.setResourceType("ai_gateway");
        log.setResourceId(String.valueOf(apiKey.getId()));
        log.setMethod("POST");
        log.setPath("/v1/chat/completions");
        log.setStatusCode(statusCode);
        log.setSuccess(false);
        log.setLatencyMs(0L);
        log.setQueryString(message);
        log.setCreatedAt(LocalDateTime.now());
        log.setUpdatedAt(LocalDateTime.now());
        auditLogService.record(log);
    }
}
