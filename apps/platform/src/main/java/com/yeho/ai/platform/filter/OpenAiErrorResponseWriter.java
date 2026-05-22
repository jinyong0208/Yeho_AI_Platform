package com.yeho.ai.platform.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class OpenAiErrorResponseWriter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String DEFAULT_ERROR_TYPE = "invalid_request_error";

    private OpenAiErrorResponseWriter() {
    }

    public static void write(
            ObjectMapper objectMapper,
            HttpServletRequest request,
            HttpServletResponse response,
            HttpStatus status,
            String message
    ) throws IOException {
        write(objectMapper, request, response, status, message, DEFAULT_ERROR_TYPE);
    }

    public static void write(
            ObjectMapper objectMapper,
            HttpServletRequest request,
            HttpServletResponse response,
            HttpStatus status,
            String message,
            String type
    ) throws IOException {
        if (response.isCommitted()) {
            return;
        }

        String requestId = response.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = request.getHeader(REQUEST_ID_HEADER);
        }
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        response.setHeader(REQUEST_ID_HEADER, requestId);
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), errorBody(status, message, type));
    }

    public static Map<String, Object> errorBody(HttpStatus status, String message) {
        return errorBody(status, message, DEFAULT_ERROR_TYPE);
    }

    public static Map<String, Object> errorBody(HttpStatus status, String message, String type) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("message", message == null || message.isBlank() ? status.getReasonPhrase() : message);
        error.put("type", type == null || type.isBlank() ? DEFAULT_ERROR_TYPE : type);
        error.put("param", NullNode.getInstance());
        error.put("code", status.value());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", error);
        return body;
    }
}
