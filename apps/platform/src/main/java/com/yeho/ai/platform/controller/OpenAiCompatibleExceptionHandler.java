package com.yeho.ai.platform.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OpenAiCompatibleExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<String> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        if (!isOpenAiCompatiblePath(request)) {
            throw ex;
        }
        return error(ex.getStatusCode().value(), reason(ex), ex.getStatusCode().toString());
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<String> handleMissingHeader(MissingRequestHeaderException ex, HttpServletRequest request) {
        if (!isOpenAiCompatiblePath(request)) {
            throw new IllegalArgumentException(ex);
        }
        return error(401, "Missing bearer token", "unauthorized");
    }

    private boolean isOpenAiCompatiblePath(HttpServletRequest request) {
        return request.getRequestURI() != null && request.getRequestURI().startsWith("/v1/embeddings");
    }

    private String reason(ResponseStatusException ex) {
        return ex.getReason() == null ? "Request failed" : ex.getReason();
    }

    private ResponseEntity<String> error(int status, String message, String code) {
        String body = """
                {"error":{"message":"%s","type":"invalid_request_error","code":"%s"}}
                """.formatted(message.replace("\"", "'"), code.replace("\"", "'"));
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
