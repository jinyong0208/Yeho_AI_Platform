package com.yeho.ai.platform.service;

import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.dto.auth.CaptchaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CaptchaService {
    private static final String CAPTCHA_PREFIX = "auth:captcha:";
    private static final Duration CAPTCHA_TTL = Duration.ofMinutes(5);
    private static final int EXPIRES_IN_SECONDS = 300;

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom random = new SecureRandom();

    public CaptchaResponse create() {
        int left = 10 + random.nextInt(40);
        int right = 1 + random.nextInt(20);
        String captchaId = UUID.randomUUID().toString().replace("-", "");
        String answer = String.valueOf(left + right);
        redisTemplate.opsForValue().set(CAPTCHA_PREFIX + captchaId, answer, CAPTCHA_TTL);
        return new CaptchaResponse(captchaId, left + " + " + right + " = ?", EXPIRES_IN_SECONDS);
    }

    public void validate(String captchaId, String captchaAnswer) {
        if (!StringUtils.hasText(captchaId) || !StringUtils.hasText(captchaAnswer)) {
            throw new BusinessException("Invalid verification code");
        }
        String key = CAPTCHA_PREFIX + captchaId;
        String expected = redisTemplate.opsForValue().get(key);
        redisTemplate.delete(key);
        if (expected == null || !expected.equals(captchaAnswer.trim())) {
            throw new BusinessException("Invalid verification code");
        }
    }
}
