package com.yeho.ai.platform.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatCompletionChunkResponse;
import com.yeho.ai.platform.dto.openai.ChatCompletionResponse;
import com.yeho.ai.platform.dto.openai.ChatMessage;
import com.yeho.ai.platform.dto.openai.OpenAiErrorResponse;
import com.yeho.ai.platform.entity.AiModel;
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
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiGatewayService {
    private final AiApiKeyService aiApiKeyService;
    private final AiWalletService aiWalletService;
    private final AiUsageLogService aiUsageLogService;
    private final com.yeho.ai.platform.gateway.ModelRouter modelRouter;
    private final ObjectMapper objectMapper;

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
                throw new GatewayException(HttpStatus.BAD_REQUEST, "invalid_request", "Use streamChatCompletions for stream requests");
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

    public StreamingResponseBody streamChatCompletions(ChatCompletionRequest request, String authorizationHeader) {
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
        try {
            validateRequest(request);
            modelCode = request.getModel();

            tenantApiKey = aiApiKeyService.authenticate(authorizationHeader);
            tenantId = tenantApiKey.getTenantId();
            apiKeyId = tenantApiKey.getId();

            route = modelRouter.route(request.getModel());
            providerCode = route.provider().getProviderCode();
            AiModel model = route.model();
            if (!Boolean.TRUE.equals(model.getSupportStream())) {
                throw new GatewayException(HttpStatus.BAD_REQUEST, "stream_not_supported", "model does not support stream");
            }

            reservedCredits = aiWalletService.estimateChargeCredits(model, request);
            aiWalletService.reserve(tenantId, reservedCredits, requestId);

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
                reservedCredits
            );
            return outputStream -> writeStreamingResponse(context, outputStream);
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
                0,
                0,
                0,
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
                aiWalletService.release(tenantId, reservedCredits, requestId, "Rollback failed stream request");
            }
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
                request
            );
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "provider_error", "Chat completion stream failed");
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
                context.request()
            );
            writeChunk(outputStream, completionId, created, context.modelCode(), null, null, usage.finishReason);
            writeDone(outputStream);
        } catch (Exception ex) {
            if (!settled) {
                aiWalletService.release(context.tenantId(), context.reservedCredits(), context.requestId(), "Rollback failed stream request");
            }
            int inputTokens = usage.inputTokens == null
                ? aiWalletService.estimatePromptTokens(context.request().getMessages())
                : usage.inputTokens;
            int outputTokens = usage.outputTokens == null
                ? aiWalletService.estimateCompletionTokens(completion.toString())
                : usage.outputTokens;
            int totalTokens = usage.totalTokens == null ? inputTokens + outputTokens : usage.totalTokens;
            String code = ex instanceof GatewayException gatewayException ? gatewayException.getCode() : "provider_error";
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
                context.request()
            );
            writeStreamError(outputStream, code, ex.getMessage());
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
        long reservedCredits
    ) {
    }

    private static class StreamUsage {
        private Integer inputTokens;
        private Integer outputTokens;
        private Integer totalTokens;
        private String finishReason = "stop";
    }
}
