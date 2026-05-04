package com.comnet360.usagesla.dto.response;

import com.comnet360.usagesla.enums.MetricType;
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
public class UsageRecordResponse {

    private Long usageId;
    private Long serviceId;
    private Long userId;
    private MetricType metricType;
    private BigDecimal value;
    private String unit;
    private LocalDateTime recordedAt;
}