package com.yeho.ai.platform.dto.gateway;

import lombok.Data;

@Data
public class RateLimitUpsertRequest {
    private Integer rpmLimit;
    private Integer tpmLimit;
    private Long dailyCreditsLimit;
    private Integer maxConcurrent;
    private String status;
}
