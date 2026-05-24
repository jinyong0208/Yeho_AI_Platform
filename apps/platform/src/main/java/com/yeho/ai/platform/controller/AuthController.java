package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.dto.auth.CaptchaResponse;
import com.yeho.ai.platform.dto.auth.LoginRequest;
import com.yeho.ai.platform.dto.auth.LoginResponse;
import com.yeho.ai.platform.dto.user.SelfPasswordChangeRequest;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.service.AuthService;
import com.yeho.ai.platform.service.CaptchaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final CaptchaService captchaService;

    @GetMapping("/captcha")
    public ApiResponse<CaptchaResponse> captcha() {
        return ApiResponse.ok(captchaService.create());
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changeOwnPassword(
        @AuthenticationPrincipal AuthenticatedUser user,
        @Valid @RequestBody SelfPasswordChangeRequest request
    ) {
        authService.changeOwnPassword(user, request);
        return ApiResponse.ok(null);
    }
}
