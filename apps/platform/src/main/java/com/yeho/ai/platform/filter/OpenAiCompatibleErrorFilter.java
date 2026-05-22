package com.yeho.ai.platform.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class OpenAiCompatibleErrorFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    public OpenAiCompatibleErrorFilter(ObjectMapper objectMapper) {
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

        try {
            filterChain.doFilter(request, response);
        } catch (ResponseStatusException ex) {
            OpenAiErrorResponseWriter.write(
                    objectMapper,
                    request,
                    response,
                    HttpStatus.valueOf(ex.getStatusCode().value()),
                    ex.getReason()
            );
        } catch (Exception ex) {
            OpenAiErrorResponseWriter.write(objectMapper, request, response, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    private boolean isOpenAiCompatibleRequest(HttpServletRequest request) {
        return request.getRequestURI() != null && request.getRequestURI().startsWith("/v1/");
    }
}
