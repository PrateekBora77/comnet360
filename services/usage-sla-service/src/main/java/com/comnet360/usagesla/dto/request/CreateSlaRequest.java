package com.comnet360.usagesla.dto.request;

import com.comnet360.usagesla.enums.SlaOperator;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateSlaRequest {

    @NotNull(message = "Service ID is required")
    private Long serviceId;

    @NotBlank(message = "Metric name is required")
    private String metric;

    @NotNull(message = "Threshold is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Threshold must be greater than 0")
    private BigDecimal threshold;

    @NotBlank(message = "Unit is required")
    private String unit;

    @NotNull(message = "Operator is required")
    private SlaOperator operator;

    private String description;
}