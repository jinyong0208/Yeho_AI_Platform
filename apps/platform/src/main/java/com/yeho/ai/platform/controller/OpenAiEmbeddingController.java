package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.dto.gateway.EmbeddingRequest;
import com.yeho.ai.platform.dto.gateway.EmbeddingResponse;
import com.yeho.ai.platform.service.EmbeddingGatewayService;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class OpenAiEmbeddingController {

    private final EmbeddingGatewayService embeddingGatewayService;

    public OpenAiEmbeddingController(EmbeddingGatewayService embeddingGatewayService) {
        this.embeddingGatewayService = embeddingGatewayService;
    }

    @PostMapping("/v1/embeddings")
    public ResponseEntity<?> embeddings(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody EmbeddingRequest request
    ) {
        try {
            EmbeddingResponse response = embeddingGatewayService.embeddings(authorization, request);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            return openAiError(HttpStatus.valueOf(ex.getStatusCode().value()), ex.getReason());
        } catch (Exception ex) {
            return openAiError(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    private ResponseEntity<Map<String, Object>> openAiError(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "error", Map.of(
                        "message", message == null ? status.getReasonPhrase() : message,
                        "type", "invalid_request_error",
                        "param", "",
                        "code", status.value()
                )
        ));
    }
}
