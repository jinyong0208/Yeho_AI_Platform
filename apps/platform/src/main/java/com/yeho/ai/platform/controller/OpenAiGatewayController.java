package com.yeho.ai.platform.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.dto.gateway.GatewayRequestContext;
import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatCompletionResponse;
import com.yeho.ai.platform.service.AiGatewayService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class OpenAiGatewayController {
    private final AiGatewayService aiGatewayService;
    private final ObjectMapper objectMapper;

    @PostMapping("/chat/completions")
    public StreamingResponseBody chatCompletions(
        @RequestBody ChatCompletionRequest request,
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @RequestHeader(value = "X-Yeho-System-Code", required = false) String systemCode,
        @RequestHeader(value = "X-Yeho-Data-Domain", required = false) String dataDomain,
        @RequestHeader(value = "X-Yeho-Agent-Code", required = false) String agentCode,
        @RequestHeader(value = "X-Yeho-Workflow-Code", required = false) String workflowCode,
        HttpServletResponse servletResponse
    ) {
        GatewayRequestContext gatewayContext = GatewayRequestContext.of(systemCode, dataDomain, agentCode, workflowCode);
        if (Boolean.TRUE.equals(request.getStream())) {
            servletResponse.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
            servletResponse.setHeader("Cache-Control", "no-cache");
            return aiGatewayService.streamChatCompletions(request, authorization, gatewayContext);
        }
        servletResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ChatCompletionResponse chatResponse = aiGatewayService.chatCompletions(request, authorization, gatewayContext);
        return outputStream -> objectMapper.writeValue(outputStream, chatResponse);
    }
}
