package com.comnet360.analytics.controller;

import com.comnet360.analytics.dto.request.GenerateReportRequest;
import com.comnet360.analytics.dto.response.IncidentSummaryResponse;
import com.comnet360.analytics.dto.response.KpiReportResponse;
import com.comnet360.analytics.dto.response.SlaComplianceResponse;
import com.comnet360.analytics.enums.ReportType;
import com.comnet360.analytics.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    // POST /api/reports/generate
    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','COMPLIANCE_OFFICER')")
    public ResponseEntity<KpiReportResponse> generateReport(
            @Valid @RequestBody GenerateReportRequest request,
            @RequestHeader(value = "X-User-Id", required = false)
            Long userId) {
        Long effectiveUserId = userId != null ? userId : 0L;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reportService.generateReport(request, effectiveUserId));
    }

    // GET /api/reports
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','COMPLIANCE_OFFICER')")
    public ResponseEntity<List<KpiReportResponse>> getAllReports(
            @RequestParam(required = false) ReportType type) {
        if (type != null)
            return ResponseEntity.ok(reportService.getReportsByType(type));
        return ResponseEntity.ok(reportService.getAllReports());
    }

    // GET /api/reports/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','COMPLIANCE_OFFICER')")
    public ResponseEntity<KpiReportResponse> getReportById(
            @PathVariable Long id) {
        return ResponseEntity.ok(reportService.getReportById(id));
    }

    // GET /api/reports/my
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','COMPLIANCE_OFFICER')")
    public ResponseEntity<List<KpiReportResponse>> getMyReports(
            @RequestHeader(value = "X-User-Id", required = false)
            Long userId) {
        Long effectiveUserId = userId != null ? userId : 0L;
        return ResponseEntity.ok(reportService.getMyReports(effectiveUserId));
    }

    // GET /api/reports/sla-compliance
    @GetMapping("/sla-compliance")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','COMPLIANCE_OFFICER')")
    public ResponseEntity<SlaComplianceResponse> getSlaCompliance(
            @RequestParam Long serviceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to) {
        return ResponseEntity.ok(
                reportService.getSlaCompliance(serviceId, from, to));
    }

    // GET /api/reports/incident-summary
    @GetMapping("/incident-summary")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','COMPLIANCE_OFFICER')")
    public ResponseEntity<IncidentSummaryResponse> getIncidentSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to) {
        return ResponseEntity.ok(reportService.getIncidentSummary(from, to));
    }

    // DELETE /api/reports/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteReport(
            @PathVariable Long id) {
        reportService.deleteReport(id);
        return ResponseEntity.ok(Map.of("message", "Report deleted successfully"));
    }
}