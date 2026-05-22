package com.yeho.ai.platform.security;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

@Service
public class ApiKeyHashService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public String generatePlainKey() {
        byte[] random = new byte[32];
        SECURE_RANDOM.nextBytes(random);
        return "yh_sk_" + HexFormat.of().formatHex(random);
    }

    public String hash(String apiKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(apiKey.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    public String prefix(String apiKey) {
        return apiKey.length() <= 16 ? apiKey : apiKey.substring(0, 16);
    }
}
