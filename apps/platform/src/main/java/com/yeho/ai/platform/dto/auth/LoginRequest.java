package com.yeho.ai.platform.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String tenantCode;

    @NotBlank
    private String username;

    @NotBlank
    private String password;
}
