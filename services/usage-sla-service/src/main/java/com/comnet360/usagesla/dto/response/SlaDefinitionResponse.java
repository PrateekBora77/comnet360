package com.comnet360.usagesla.dto.response;

import com.comnet360.usagesla.enums.SlaOperator;
import com.comnet360.usagesla.enums.SlaStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaDefinitionResponse {

    private Long slaId;
    private Long serviceId;
    private String metric;
    private BigDecimal threshold;
    private String unit;
    private SlaOperator operator;
    private SlaStatus status;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}