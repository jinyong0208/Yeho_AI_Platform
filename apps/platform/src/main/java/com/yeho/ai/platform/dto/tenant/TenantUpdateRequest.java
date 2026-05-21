package com.yeho.ai.platform.dto.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TenantUpdateRequest {
    @NotBlank
    private String tenantName;

    private String status;
    private String contactName;
    private String contactPhone;

    @Email
    private String contactEmail;
}
