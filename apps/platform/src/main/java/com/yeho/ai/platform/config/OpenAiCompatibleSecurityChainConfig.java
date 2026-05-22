package com.yeho.ai.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.filter.OpenAiErrorResponseWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class OpenAiCompatibleSecurityChainConfig {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public SecurityFilterChain openAiCompatibleSecurityFilterChain(
            HttpSecurity http,
            ObjectMapper objectMapper
    ) throws Exception {
        return http
                .securityMatcher("/v1/**")
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) ->
                                OpenAiErrorResponseWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Invalid API key"))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                OpenAiErrorResponseWriter.write(objectMapper, request, response, HttpStatus.FORBIDDEN, "API key scope denied"))
                )
                .build();
    }
}
