package com.yeho.ai.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeho.ai.platform.filter.OpenAiCompatiblePreflightFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class OpenAiCompatibleFilterConfig {

    @Bean
    public FilterRegistrationBean<OpenAiCompatiblePreflightFilter> openAiCompatiblePreflightFilter(ObjectMapper objectMapper) {
        FilterRegistrationBean<OpenAiCompatiblePreflightFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new OpenAiCompatiblePreflightFilter(objectMapper));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/v1/*");
        registration.setName("openAiCompatiblePreflightFilter");
        return registration;
    }
}
