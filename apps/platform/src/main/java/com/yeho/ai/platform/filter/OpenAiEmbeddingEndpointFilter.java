package com.yeho.ai.platform.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.dto.gateway.EmbeddingRequest;
import com.yeho.ai.platform.service.EmbeddingGatewayService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OpenAiEmbeddingEndpointFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(OpenAiEmbeddingEndpointFilter.class);

    private final ObjectMapper objectMapper;
    private final EmbeddingGatewayService embeddingGatewayService;

    public OpenAiEmbeddingEndpointFilter(ObjectMapper objectMapper, EmbeddingGatewayService embeddingGatewayService) {
        this.objectMapper = objectMapper;
        this.embeddingGatewayService = embeddingGatewayService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!isEmbeddingRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            EmbeddingRequest embeddingRequest = objectMapper.readValue(request.getInputStream(), EmbeddingRequest.class);
            Object result = embeddingGatewayService.embeddings(request.getHeader(HttpHeaders.AUTHORIZATION), embeddingRequest);
            writeJson(response, HttpStatus.OK, result);
        } catch (ResponseStatusException ex) {
            writeOpenAiError(response, HttpStatus.valueOf(ex.getStatusCode().value()), ex.getReason());
        } catch (Exception ex) {
            log.warn("Embedding endpoint failed before provider call: {}: {}", ex.getClass().getSimpleName(), ex.getMessage());
            writeOpenAiError(response, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    private boolean isEmbeddingRequest(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod()) && "/v1/embeddings".equals(request.getRequestURI());
    }

    private void writeOpenAiError(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        writeJson(response, status, Map.of(
                "error", Map.of(
                        "message", message == null ? status.getReasonPhrase() : message,
                        "type", "invalid_request_error",
                        "param", "",
                        "code", status.value()
                )
        ));
    }

    private void writeJson(HttpServletResponse response, HttpStatus status, Object body) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), body);
    }
}
