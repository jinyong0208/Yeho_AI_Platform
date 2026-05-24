package com.yeho.ai.platform.dto.system;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BusinessSystemRequest {
    @NotBlank
    private String systemCode;

    @NotBlank
    private String systemName;

    private String description;
    private String status;
}
