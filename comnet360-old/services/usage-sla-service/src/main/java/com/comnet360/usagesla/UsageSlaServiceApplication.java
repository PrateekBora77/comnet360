package com.comnet360.usagesla;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class UsageSlaServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UsageSlaServiceApplication.class, args);
    }
}