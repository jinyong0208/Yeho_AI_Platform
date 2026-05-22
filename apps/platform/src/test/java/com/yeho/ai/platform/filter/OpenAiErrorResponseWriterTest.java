package com.yeho.ai.platform.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiErrorResponseWriterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void errorBodyUsesOpenAiCompatibleEnvelope() {
        Map<String, Object> body = OpenAiErrorResponseWriter.errorBody(HttpStatus.UNAUTHORIZED, "Invalid API key");

        assertThat(body).containsOnlyKeys("error");
        @SuppressWarnings("unchecked")
        Map<String, Object> error = (Map<String, Object>) body.get("error");
        assertThat(error.get("message")).isEqualTo("Invalid API key");
        assertThat(error.get("type")).isEqualTo("invalid_request_error");
        assertThat(error.get("code")).isEqualTo(401);
        assertThat(String.valueOf(error.get("param"))).isEqualTo("null");
    }

    @Test
    void errorBodyFallsBackToReasonPhraseAndDefaultType() {
        Map<String, Object> body = OpenAiErrorResponseWriter.errorBody(HttpStatus.TOO_MANY_REQUESTS, "", "");

        @SuppressWarnings("unchecked")
        Map<String, Object> error = (Map<String, Object>) body.get("error");
        assertThat(error.get("message")).isEqualTo("Too Many Requests");
        assertThat(error.get("type")).isEqualTo("invalid_request_error");
        assertThat(error.get("code")).isEqualTo(429);
    }

    @Test
    void writePreservesExistingRequestIdHeader() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(OpenAiErrorResponseWriter.REQUEST_ID_HEADER, "req-test-1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        OpenAiErrorResponseWriter.write(objectMapper, request, response, HttpStatus.FORBIDDEN, "API key scope denied");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getHeader(OpenAiErrorResponseWriter.REQUEST_ID_HEADER)).isEqualTo("req-test-1");
        JsonNode body = objectMapper.readTree(response.getContentAsString());
        assertThat(body.path("error").path("message").asText()).isEqualTo("API key scope denied");
        assertThat(body.path("error").path("param").isNull()).isTrue();
    }
}
