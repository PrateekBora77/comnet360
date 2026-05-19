package com.comnet360.provisioning.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateConfigurationRequest {

    @NotBlank(message = "Parameter name is required")
    private String parameter;

    @NotBlank(message = "Parameter value is required")
    private String value;

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;
}