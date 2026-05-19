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
public class IncidentSummaryResponse {

    private Long totalIncidents;
    private Long openIncidents;
    private Long inProgressIncidents;
    private Long resolvedIncidents;
    private Long closedIncidents;
    private Long criticalIncidents;
    private Long highIncidents;
    private Long mediumIncidents;
    private Long lowIncidents;
    private Double averageMttrMinutes;
    private LocalDate fromDate;
    private LocalDate toDate;
}