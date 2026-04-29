package com.comnet360.analytics.service;

import com.comnet360.analytics.dto.request.GenerateReportRequest;
import com.comnet360.analytics.dto.response.IncidentSummaryResponse;
import com.comnet360.analytics.dto.response.KpiReportResponse;
import com.comnet360.analytics.dto.response.SlaComplianceResponse;
import com.comnet360.analytics.entity.KpiReport;
import com.comnet360.analytics.enums.ReportType;
import com.comnet360.analytics.exception.BadRequestException;
import com.comnet360.analytics.exception.ResourceNotFoundException;
import com.comnet360.analytics.repository.KpiReportRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final KpiReportRepository   kpiReportRepository;
    private final AnalyticsDataService  analyticsDataService;
    private final ObjectMapper          objectMapper;

    // ── Generate Report ──────────────────────────────────────────

    @Transactional
    public KpiReportResponse generateReport(GenerateReportRequest request,
                                            Long generatedBy) {
        // Validate date range
        if (request.getFromDate().isAfter(request.getToDate())) {
            throw new BadRequestException(
                    "fromDate must be before toDate");
        }

        // Build metrics based on report type
        String metricsJson = buildMetrics(request);

        KpiReport report = KpiReport.builder()
                .title(request.getTitle())
                .scope(request.getScope())
                .reportType(request.getReportType())
                .metrics(metricsJson)
                .fromDate(request.getFromDate())
                .toDate(request.getToDate())
                .generatedBy(generatedBy)
                .build();

        report = kpiReportRepository.save(report);
        log.info("Report generated: id={} type={} by={}",
                report.getReportId(), report.getReportType(), generatedBy);
        return toResponse(report);
    }

    // ── Queries ───────────────────────────────────────────────────

    public List<KpiReportResponse> getAllReports() {
        return kpiReportRepository.findAll()
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public KpiReportResponse getReportById(Long reportId) {
        return toResponse(findById(reportId));
    }

    public List<KpiReportResponse> getReportsByType(ReportType reportType) {
        return kpiReportRepository
                .findByReportTypeOrderByGeneratedDateDesc(reportType)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<KpiReportResponse> getMyReports(Long userId) {
        return kpiReportRepository
                .findByGeneratedByOrderByGeneratedDateDesc(userId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Compliance & Summary ──────────────────────────────────────

    public SlaComplianceResponse getSlaCompliance(Long serviceId,
                                                  LocalDate from,
                                                  LocalDate to) {
        return analyticsDataService.buildSlaCompliance(serviceId, from, to);
    }

    public IncidentSummaryResponse getIncidentSummary(LocalDate from,
                                                      LocalDate to) {
        return analyticsDataService.buildIncidentSummary(from, to);
    }

    // ── Delete ────────────────────────────────────────────────────

    @Transactional
    public void deleteReport(Long reportId) {
        if (!kpiReportRepository.existsById(reportId)) {
            throw new ResourceNotFoundException(
                    "Report not found with id: " + reportId);
        }
        kpiReportRepository.deleteById(reportId);
        log.info("Report deleted: id={}", reportId);
    }

    // ── Private Helpers ───────────────────────────────────────────

    private String buildMetrics(GenerateReportRequest request) {
        try {
            Map<String, Object> metrics = switch (request.getReportType()) {
                case SLA_COMPLIANCE -> Map.of(
                        "reportType", "SLA_COMPLIANCE",
                        "scope", request.getScope(),
                        "fromDate", request.getFromDate().toString(),
                        "toDate", request.getToDate().toString(),
                        "generatedAt", java.time.LocalDateTime.now().toString()
                );
                case INCIDENT_SUMMARY -> Map.of(
                        "reportType", "INCIDENT_SUMMARY",
                        "scope", request.getScope(),
                        "fromDate", request.getFromDate().toString(),
                        "toDate", request.getToDate().toString(),
                        "generatedAt", java.time.LocalDateTime.now().toString()
                );
                case USAGE_TREND -> Map.of(
                        "reportType", "USAGE_TREND",
                        "scope", request.getScope(),
                        "fromDate", request.getFromDate().toString(),
                        "toDate", request.getToDate().toString(),
                        "generatedAt", java.time.LocalDateTime.now().toString()
                );
                case SERVICE_HEALTH -> Map.of(
                        "reportType", "SERVICE_HEALTH",
                        "scope", request.getScope(),
                        "fromDate", request.getFromDate().toString(),
                        "toDate", request.getToDate().toString(),
                        "generatedAt", java.time.LocalDateTime.now().toString()
                );
                default -> Map.of(
                        "reportType", "CUSTOM",
                        "scope", request.getScope(),
                        "generatedAt", java.time.LocalDateTime.now().toString()
                );
            };
            return objectMapper.writeValueAsString(metrics);
        } catch (Exception e) {
            log.error("Error building metrics JSON: {}", e.getMessage());
            return "{}";
        }
    }

    private KpiReport findById(Long reportId) {
        return kpiReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Report not found with id: " + reportId));
    }

    public KpiReportResponse toResponse(KpiReport report) {
        return KpiReportResponse.builder()
                .reportId(report.getReportId())
                .title(report.getTitle())
                .scope(report.getScope())
                .reportType(report.getReportType())
                .metrics(report.getMetrics())
                .fromDate(report.getFromDate())
                .toDate(report.getToDate())
                .generatedBy(report.getGeneratedBy())
                .generatedDate(report.getGeneratedDate())
                .build();
    }
}