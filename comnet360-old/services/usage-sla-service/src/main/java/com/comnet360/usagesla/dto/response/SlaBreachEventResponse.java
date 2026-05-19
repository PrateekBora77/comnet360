package com.comnet360.usagesla.dto.response;

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
public class SlaBreachEventResponse {

    private Long breachId;
    private Long slaId;
    private Long serviceId;
    private BigDecimal actualValue;
    private BigDecimal thresholdValue;
    private LocalDateTime breachTime;
    private Boolean resolved;
    private LocalDateTime resolvedAt;
}