package com.comnet360.usagesla.dto.request;

import com.comnet360.usagesla.enums.SlaOperator;
import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PatchSlaRequest {

    // Only threshold, operator, unit, and description are patchable.
    // serviceId and metric are structural — changing them invalidates breach history.
    // status has its own dedicated endpoint (PUT /api/sla/{id}/status).

    @DecimalMin(value = "0.0", inclusive = false, message = "Threshold must be greater than 0")
    private BigDecimal threshold;

    private SlaOperator operator;

    private String unit;

    private String description;
}
