package com.yeho.ai.platform.dto.user;

import jakarta.validation.constraints.Email;
import lombok.Data;

import java.util.List;

@Data
public class UserUpdateRequest {
    private String password;
    private String displayName;

    @Email
    private String email;

    private String phone;
    private String status;
    private List<String> roleCodes;
}
