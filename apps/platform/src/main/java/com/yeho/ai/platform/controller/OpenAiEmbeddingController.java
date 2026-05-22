package com.yeho.ai.platform.controller;

import com.yeho.ai.platform.dto.gateway.EmbeddingRequest;
import com.yeho.ai.platform.dto.gateway.EmbeddingResponse;
import com.yeho.ai.platform.service.EmbeddingGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;


@RestController
@RequiredArgsConstructor
public class OpenAiEmbeddingController {

    private final EmbeddingGatewayService embeddingGatewayService;

    @PostMapping("/v1/embeddings")
    public ResponseEntity<?> embeddings(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody EmbeddingRequest request
    ) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return error(401, "Missing bearer token", "unauthorized");
        }
        try {
            EmbeddingResponse response = embeddingGatewayService.embeddings(authorization, request);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            return error(ex.getStatusCode().value(),
                    ex.getReason() == null ? "Embedding request failed" : ex.getReason(),
                    ex.getStatusCode().toString());
        }
    }

    private ResponseEntity<String> error(int status, String message, String code) {
        String body = """
                {"error":{"message":"%s","type":"invalid_request_error","code":"%s"}}
                """.formatted(message.replace("\"", "'"), code.replace("\"", "'"));
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
