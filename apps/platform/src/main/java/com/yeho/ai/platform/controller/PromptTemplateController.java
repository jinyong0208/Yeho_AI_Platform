package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.agent.PromptTemplateRequest;
import com.yeho.ai.platform.dto.agent.PromptTemplateResponse;
import com.yeho.ai.platform.dto.agent.PromptVersionResponse;
import com.yeho.ai.platform.service.PromptTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/prompt-templates")
@RequiredArgsConstructor
public class PromptTemplateController {

    private final PromptTemplateService promptTemplateService;

    @GetMapping
    public ApiResponse<List<PromptTemplateResponse>> list(@RequestParam(required = false) Long tenantId) {
        return ApiResponse.ok(promptTemplateService.list(tenantId));
    }

    @PostMapping
    public ApiResponse<PromptTemplateResponse> create(@RequestBody PromptTemplateRequest request) {
        return ApiResponse.ok(promptTemplateService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<PromptTemplateResponse> update(@PathVariable Long id, @RequestBody PromptTemplateRequest request) {
        return ApiResponse.ok(promptTemplateService.update(id, request));
    }

    @PostMapping("/{id}/publish")
    public ApiResponse<PromptVersionResponse> publish(@PathVariable Long id) {
        return ApiResponse.ok(promptTemplateService.publish(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<PromptTemplateResponse> disable(@PathVariable Long id) {
        return ApiResponse.ok(promptTemplateService.disable(id));
    }

    @GetMapping("/{id}/versions")
    public ApiResponse<List<PromptVersionResponse>> versions(@PathVariable Long id) {
        return ApiResponse.ok(promptTemplateService.versions(id));
    }
}
