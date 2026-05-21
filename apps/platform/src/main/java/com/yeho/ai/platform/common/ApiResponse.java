package com.yeho.ai.platform.common;

import java.time.LocalDateTime;

public record ApiResponse<T>(
    int code,
    String message,
    String requestId,
    T data,
    LocalDateTime timestamp
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(0, "OK", RequestContext.getRequestId(), data, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, RequestContext.getRequestId(), null, LocalDateTime.now());
    }
}
