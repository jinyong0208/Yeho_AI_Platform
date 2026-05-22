package com.yeho.ai.platform.common;

import jakarta.validation.ConstraintViolationException;
import com.yeho.ai.platform.dto.openai.OpenAiErrorResponse;
import com.yeho.ai.platform.gateway.GatewayException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(404, ex.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(400, ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(403, "Access denied"));
    }

    @ExceptionHandler(GatewayException.class)
    public ResponseEntity<OpenAiErrorResponse> handleGateway(GatewayException ex) {
        return ResponseEntity.status(ex.getStatus()).body(new OpenAiErrorResponse(
            new OpenAiErrorResponse.OpenAiError(
                ex.getMessage(),
                errorType(ex.getStatus()),
                ex.getCode()
            )
        ));
    }

    @ExceptionHandler({
        MethodArgumentNotValidException.class,
        ConstraintViolationException.class,
        BindException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleValidation(Exception ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(400, "Invalid request parameters"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error(500, "Internal server error"));
    }

    private String errorType(HttpStatus status) {
        if (status == HttpStatus.UNAUTHORIZED) {
            return "authentication_error";
        }
        if (status == HttpStatus.PAYMENT_REQUIRED) {
            return "insufficient_quota";
        }
        if (status.is4xxClientError()) {
            return "invalid_request_error";
        }
        return "server_error";
    }
}
