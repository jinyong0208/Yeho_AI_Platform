package com.yeho.ai.platform.dto.auth;

public record CaptchaResponse(
    String captchaId,
    String challenge,
    Integer expiresInSeconds
) {
}
