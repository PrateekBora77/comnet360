package com.comnet360.usagesla.dto.request;

import com.comnet360.usagesla.enums.MetricType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class RecordUsageRequest {

    @NotNull(message = "Service ID is required")
    private Long serviceId;

    @NotNull(message = "Metric type is required")
    private MetricType metricType;

    @NotNull(message = "Value is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Value must be greater than 0")
    private BigDecimal value;

    @NotBlank(message = "Unit is required")
    private String unit;

    // Optional — defaults to now if not provided
    private LocalDateTime recordedAt;
}