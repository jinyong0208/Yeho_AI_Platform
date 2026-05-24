package com.yeho.ai.platform.dto.gateway;

import java.util.Set;
import lombok.Data;

@Data
public class ApiKeyScopeUpdateRequest {
    private Set<String> scopes;
    private Set<String> allowedSystemCodes;
    private Set<String> allowedDataDomains;
}
