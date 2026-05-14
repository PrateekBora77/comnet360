package com.comnet360.analytics.dto.request;

import com.comnet360.analytics.enums.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class GenerateReportRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Scope is required")
    private String scope;

    @NotNull(message = "Report type is required")
    private ReportType reportType;

    @NotNull(message = "From date is required")
    private LocalDate fromDate;

    @NotNull(message = "To date is required")
    private LocalDate toDate;

    // Required for SLA_COMPLIANCE reports — identifies which service to analyse
    private Long serviceId;
}