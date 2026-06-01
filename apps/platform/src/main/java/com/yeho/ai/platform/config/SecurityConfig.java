package com.yeho.ai.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.common.ApiResponse;
import com.yeho.ai.platform.security.TokenAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.nio.charset.StandardCharsets;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final TokenAuthenticationFilter tokenAuthenticationFilter;
    private final ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/captcha").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/chat/completions", "/v1/embeddings").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/models").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/agent-runtime/configs/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/workflow-runtime/configs/**").permitAll()
                .requestMatchers("/mock-provider/**").permitAll()
                .requestMatchers("/actuator/health/**", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) ->
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
                .accessDeniedHandler((request, response, accessDeniedException) ->
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Access denied"))
            )
            .addFilterBefore(tokenAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    private void writeJsonError(HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiResponse.error(status, message));
    }
}
