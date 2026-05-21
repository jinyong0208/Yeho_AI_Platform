package com.yeho.ai.platform.dto.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TenantCreateRequest {
    @NotBlank
    private String tenantCode;

    @NotBlank
    private String tenantName;

    private String contactName;
    private String contactPhone;

    @Email
    private String contactEmail;
}
