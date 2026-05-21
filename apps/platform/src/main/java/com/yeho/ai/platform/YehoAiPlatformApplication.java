package com.yeho.ai.platform;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@MapperScan("com.yeho.ai.platform.mapper")
@SpringBootApplication
public class YehoAiPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(YehoAiPlatformApplication.class, args);
    }
}
