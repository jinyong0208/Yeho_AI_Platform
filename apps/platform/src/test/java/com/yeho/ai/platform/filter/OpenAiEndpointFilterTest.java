package com.yeho.ai.platform.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.dto.gateway.EmbeddingResponse;
import com.yeho.ai.platform.service.EmbeddingGatewayService;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OpenAiEndpointFilterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private EmbeddingGatewayService embeddingGatewayService;

    @Test
    void preflightReturnsOpenAiErrorForMissingChatAuthorization() throws ServletException, IOException {
        OpenAiCompatiblePreflightFilter filter = new OpenAiCompatiblePreflightFilter(objectMapper);
        MockHttpServletRequest request = request("POST", "/v1/chat/completions");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        JsonNode body = objectMapper.readTree(response.getContentAsString(StandardCharsets.UTF_8));
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getHeader(OpenAiErrorResponseWriter.REQUEST_ID_HEADER)).isNotBlank();
        assertThat(body.at("/error/type").asText()).isEqualTo("invalid_request_error");
        assertThat(body.at("/error/code").asInt()).isEqualTo(401);
        assertThat(body.at("/error/message").asText()).isEqualTo("Missing Authorization header");
    }

    @Test
    void preflightAllowsBearerModelsRequestToContinue() throws ServletException, IOException {
        OpenAiCompatiblePreflightFilter filter = new OpenAiCompatiblePreflightFilter(objectMapper);
        MockHttpServletRequest request = request("GET", "/v1/models");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer yh_test");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isSameAs(request);
    }

    @Test
    void modelsEndpointReturnsOpenAiCompatibleListForScopedKey() throws ServletException, IOException {
        OpenAiModelsEndpointFilter filter = new OpenAiModelsEndpointFilter(objectMapper, jdbcTemplate);
        MockHttpServletRequest request = request("GET", "/v1/models");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer yh_test");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jdbcTemplate.queryForList(argThat(sql -> sql.contains("from tenant_api_key")), any(Object[].class)))
            .thenReturn(List.of(Map.of(
                "id", 10L,
                "tenant_id", 1L,
                "scopes", "models:read"
            )));
        when(jdbcTemplate.queryForList(argThat(sql -> sql.contains("from ai_model"))))
            .thenReturn(List.of(Map.of(
                "id", "qwen-plus",
                "object", "model",
                "created", 123L,
                "owned_by", "QWEN"
            )));

        filter.doFilter(request, response, new MockFilterChain());

        JsonNode body = objectMapper.readTree(response.getContentAsString(StandardCharsets.UTF_8));
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(body.at("/object").asText()).isEqualTo("list");
        assertThat(body.at("/data/0/id").asText()).isEqualTo("qwen-plus");
        assertThat(body.at("/data/0/owned_by").asText()).isEqualTo("QWEN");
    }

    @Test
    void embeddingsEndpointReturnsOpenAiCompatibleResponse() throws ServletException, IOException {
        OpenAiEmbeddingEndpointFilter filter = new OpenAiEmbeddingEndpointFilter(objectMapper, embeddingGatewayService);
        MockHttpServletRequest request = request("POST", "/v1/embeddings");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer yh_test");
        request.setContentType(MediaType.APPLICATION_JSON_VALUE);
        request.setContent("""
            {
              "model": "qwen-text-embedding",
              "input": "hello"
            }
            """.getBytes(StandardCharsets.UTF_8));
        MockHttpServletResponse response = new MockHttpServletResponse();

        EmbeddingResponse embeddingResponse = new EmbeddingResponse(
            "list",
            List.of(new EmbeddingResponse.EmbeddingData("embedding", List.of(0.1, 0.2), 0)),
            "qwen-text-embedding",
            new EmbeddingResponse.Usage(1, 1)
        );
        when(embeddingGatewayService.embeddings(eq("Bearer yh_test"), any()))
            .thenReturn(embeddingResponse);

        filter.doFilter(request, response, new MockFilterChain());

        JsonNode body = objectMapper.readTree(response.getContentAsString(StandardCharsets.UTF_8));
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(body.at("/object").asText()).isEqualTo("list");
        assertThat(body.at("/model").asText()).isEqualTo("qwen-text-embedding");
        assertThat(body.at("/data/0/object").asText()).isEqualTo("embedding");
        assertThat(body.at("/usage/total_tokens").asInt()).isEqualTo(1);
        verify(embeddingGatewayService).embeddings(eq("Bearer yh_test"), any());
    }

    private MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setContentType(MediaType.APPLICATION_JSON_VALUE);
        return request;
    }
}
