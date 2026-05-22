package com.yeho.ai.platform.dto.gateway;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ApiKeyCreateRequest {
    @NotBlank
    private String name;

    private LocalDateTime expiredAt;
}
