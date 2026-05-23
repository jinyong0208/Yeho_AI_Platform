package com.yeho.ai.platform.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProviderConnectionTestServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ApplicationContext applicationContext;

    @Test
    void resolveProbeModelPrioritizesChatModelsOverEmbeddings() {
        ProviderConnectionTestService service = new ProviderConnectionTestService(jdbcTemplate, applicationContext);
        when(jdbcTemplate.queryForList(anyString(), eq(1L)))
            .thenReturn(List.of(Map.of("model_code", "qwen-plus")));

        String modelCode = ReflectionTestUtils.invokeMethod(service, "resolveProbeModel", 1L);

        assertThat(modelCode).isEqualTo("qwen-plus");
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sqlCaptor.capture(), eq(1L));
        assertThat(sqlCaptor.getValue()).contains("lower(model_code) like '%embedding%'");
    }
}
