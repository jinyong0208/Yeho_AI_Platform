package com.yeho.ai.platform.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
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
        HttpServletResponse servletResponse
    ) {
        if (Boolean.TRUE.equals(request.getStream())) {
            servletResponse.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
            servletResponse.setHeader("Cache-Control", "no-cache");
            return aiGatewayService.streamChatCompletions(request, authorization);
        }
        servletResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ChatCompletionResponse chatResponse = aiGatewayService.chatCompletions(request, authorization);
        return outputStream -> objectMapper.writeValue(outputStream, chatResponse);
    }
}
