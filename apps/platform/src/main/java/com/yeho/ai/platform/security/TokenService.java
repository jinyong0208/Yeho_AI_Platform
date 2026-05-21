package com.yeho.ai.platform.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.entity.TenantUser;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TokenService {
    private static final String TOKEN_PREFIX = "auth:token:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${yeho.security.token-ttl-hours:12}")
    private long tokenTtlHours;

    public String create(TenantUser user, List<String> roles) {
        String token = "yh_" + UUID.randomUUID().toString().replace("-", "");
        var payload = new AuthenticatedUser(user.getId(), user.getTenantId(), user.getUsername(), roles);
        try {
            redisTemplate.opsForValue().set(
                TOKEN_PREFIX + token,
                objectMapper.writeValueAsString(payload),
                Duration.ofHours(tokenTtlHours)
            );
        } catch (JsonProcessingException ex) {
            throw new BusinessException("Failed to create login token");
        }
        return token;
    }

    public Optional<AuthenticatedUser> resolve(String token) {
        String value = redisTemplate.opsForValue().get(TOKEN_PREFIX + token);
        if (value == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(value, AuthenticatedUser.class));
        } catch (JsonProcessingException ex) {
            return Optional.empty();
        }
    }
}
