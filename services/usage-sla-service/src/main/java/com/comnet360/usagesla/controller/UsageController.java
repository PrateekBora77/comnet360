package com.comnet360.usagesla.controller;

import com.comnet360.usagesla.dto.request.RecordUsageRequest;
import com.comnet360.usagesla.dto.response.UsageRecordResponse;
import com.comnet360.usagesla.enums.MetricType;
import com.comnet360.usagesla.service.UsageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/usage")
@RequiredArgsConstructor
public class UsageController {

    private final UsageService usageService;

    // POST /api/usage
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','NETWORK_ENGINEER')")
    public ResponseEntity<UsageRecordResponse> recordUsage(
            @Valid @RequestBody RecordUsageRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {

        // If X-User-Id header is missing (direct Swagger call),
        // use a default userId of 0 — gateway always provides this in production
        Long effectiveUserId = (userId != null) ? userId : 0L;

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(usageService.recordUsage(request, effectiveUserId));
    }

    // GET /api/usage/service/{serviceId}
    @GetMapping("/service/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<UsageRecordResponse>> getByService(
            @PathVariable Long serviceId) {
        return ResponseEntity.ok(usageService.getUsageByService(serviceId));
    }

    // GET /api/usage/service/{serviceId}/metric/{metricType}
    @GetMapping("/service/{serviceId}/metric/{metricType}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<UsageRecordResponse>> getByServiceAndMetric(
            @PathVariable Long serviceId,
            @PathVariable MetricType metricType) {
        return ResponseEntity.ok(
                usageService.getUsageByServiceAndMetric(serviceId, metricType));
    }

    // GET /api/usage/service/{serviceId}/range
    @GetMapping("/service/{serviceId}/range")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<UsageRecordResponse>> getByServiceAndDateRange(
            @PathVariable Long serviceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to) {
        return ResponseEntity.ok(
                usageService.getUsageByServiceAndDateRange(serviceId, from, to));
    }

    // GET /api/usage/user/{userId}
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<UsageRecordResponse>> getByUser(
            @PathVariable Long userId) {
        return ResponseEntity.ok(usageService.getUsageByUser(userId));
    }

    // GET /api/usage/{usageId}
    @GetMapping("/{usageId}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<UsageRecordResponse> getById(
            @PathVariable Long usageId) {
        return ResponseEntity.ok(usageService.getUsageById(usageId));
    }
}