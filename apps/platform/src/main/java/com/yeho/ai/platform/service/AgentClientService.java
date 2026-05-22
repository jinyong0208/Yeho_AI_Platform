package com.yeho.ai.platform.service;

import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.common.RequestContext;
import com.yeho.ai.platform.dto.agent.AgentClientRunRequest;
import com.yeho.ai.platform.dto.agent.AgentRunRequest;
import com.yeho.ai.platform.dto.agent.AgentRunResponse;
import com.yeho.ai.platform.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;
import java.util.UUID;

@Service
public class AgentClientService {
    private final RestClient restClient;

    public AgentClientService(
        RestClient.Builder builder,
        @Value("${yeho.agent.base-url}") String agentBaseUrl
    ) {
        this.restClient = builder.baseUrl(agentBaseUrl).build();
    }

    public AgentRunResponse runDemo(AgentRunRequest request, AuthenticatedUser user) {
        String requestId = RequestContext.getRequestId();
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }
        var clientRequest = new AgentClientRunRequest(
            request.input(),
            String.valueOf(user.tenantId()),
            String.valueOf(user.userId()),
            requestId,
            request.context() == null ? Map.of() : request.context()
        );
        try {
            return restClient.post()
                .uri("/api/v1/agents/demo/run")
                .body(clientRequest)
                .retrieve()
                .body(AgentRunResponse.class);
        } catch (RestClientResponseException ex) {
            throw new BusinessException("Agent service returned an error");
        } catch (RestClientException ex) {
            throw new BusinessException("Agent service is unavailable");
        }
    }
}
