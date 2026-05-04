package com.comnet360.provisioning.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigurationResponse {

    private Long configId;
    private Long serviceId;
    private String parameter;
    private String value;
    private LocalDate effectiveDate;
    private Long createdBy;
    private LocalDateTime createdAt;
}