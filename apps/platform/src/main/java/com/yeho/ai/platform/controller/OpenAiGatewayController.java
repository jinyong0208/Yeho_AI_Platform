package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.dto.openai.ChatCompletionRequest;
import com.yeho.ai.platform.dto.openai.ChatCompletionResponse;
import com.yeho.ai.platform.service.AiGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class OpenAiGatewayController {
    private final AiGatewayService aiGatewayService;

    @PostMapping("/chat/completions")
    public ChatCompletionResponse chatCompletions(
        @RequestBody ChatCompletionRequest request,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return aiGatewayService.chatCompletions(request, authorization);
    }
}
