package com.comnet360.analytics.dto.response;

import com.comnet360.analytics.enums.ReportType;
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
public class KpiReportResponse {

    private Long reportId;
    private String title;
    private String scope;
    private ReportType reportType;
    private String metrics;
    private LocalDate fromDate;
    private LocalDate toDate;
    private Long generatedBy;
    private LocalDateTime generatedDate;
}