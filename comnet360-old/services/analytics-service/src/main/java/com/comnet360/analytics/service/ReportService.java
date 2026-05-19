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
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
            Map<String, Object> metrics = new LinkedHashMap<>();
            metrics.put("reportType",  request.getReportType().name());
            metrics.put("scope",       request.getScope());
            metrics.put("fromDate",    request.getFromDate().toString());
            metrics.put("toDate",      request.getToDate().toString());
            metrics.put("generatedAt", LocalDateTime.now().toString());

            switch (request.getReportType()) {
                case SLA_COMPLIANCE -> {
                    if (request.getServiceId() == null) {
                        throw new BadRequestException(
                                "serviceId is required for SLA_COMPLIANCE reports");
                    }
                    SlaComplianceResponse sla = analyticsDataService.buildSlaCompliance(
                            request.getServiceId(),
                            request.getFromDate(),
                            request.getToDate());
                    metrics.put("serviceId",            sla.getServiceId());
                    metrics.put("metric",               sla.getMetric());
                    metrics.put("totalBreaches",        sla.getTotalBreaches());
                    metrics.put("resolvedBreaches",     sla.getResolvedBreaches());
                    metrics.put("unresolvedBreaches",   sla.getUnresolvedBreaches());
                    metrics.put("compliancePercentage", sla.getCompliancePercentage());
                }
                case INCIDENT_SUMMARY -> {
                    IncidentSummaryResponse summary = analyticsDataService.buildIncidentSummary(
                            request.getFromDate(),
                            request.getToDate());
                    metrics.put("totalIncidents",      summary.getTotalIncidents());
                    metrics.put("openIncidents",       summary.getOpenIncidents());
                    metrics.put("inProgressIncidents", summary.getInProgressIncidents());
                    metrics.put("resolvedIncidents",   summary.getResolvedIncidents());
                    metrics.put("closedIncidents",     summary.getClosedIncidents());
                    metrics.put("criticalIncidents",   summary.getCriticalIncidents());
                    metrics.put("highIncidents",       summary.getHighIncidents());
                    metrics.put("mediumIncidents",     summary.getMediumIncidents());
                    metrics.put("lowIncidents",        summary.getLowIncidents());
                    metrics.put("averageMttrMinutes",  summary.getAverageMttrMinutes());
                }
                // USAGE_TREND, SERVICE_HEALTH, CUSTOM — metadata only (no live data source yet)
            }

            return objectMapper.writeValueAsString(metrics);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error building metrics JSON for type={}: {}",
                    request.getReportType(), e.getMessage(), e);
            throw new RuntimeException("Failed to compute report data", e);
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