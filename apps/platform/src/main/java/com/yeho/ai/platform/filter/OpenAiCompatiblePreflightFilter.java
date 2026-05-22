package com.yeho.ai.platform.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

@Order(Ordered.HIGHEST_PRECEDENCE)
public class OpenAiCompatiblePreflightFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    public OpenAiCompatiblePreflightFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!isOpenAiCompatibleRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || authorization.isBlank()) {
            OpenAiErrorResponseWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Missing Authorization header");
            return;
        }
        if (!authorization.regionMatches(true, 0, "Bearer ", 0, "Bearer ".length())) {
            OpenAiErrorResponseWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Authorization must use Bearer token");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isOpenAiCompatibleRequest(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) {
            return false;
        }
        return ("POST".equalsIgnoreCase(request.getMethod()) && "/v1/chat/completions".equals(uri))
                || ("POST".equalsIgnoreCase(request.getMethod()) && "/v1/embeddings".equals(uri))
                || ("GET".equalsIgnoreCase(request.getMethod()) && "/v1/models".equals(uri));
    }
}
