package com.comnet360.analytics.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaComplianceResponse {

    private Long serviceId;
    private String metric;
    private Long totalBreaches;
    private Long resolvedBreaches;
    private Long unresolvedBreaches;
    private Double compliancePercentage;
    private LocalDate fromDate;
    private LocalDate toDate;
}