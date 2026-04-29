package com.comnet360.iam.controller;

import com.comnet360.iam.entity.AuditLog;
import com.comnet360.iam.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    // GET /api/audit-logs
    // All logs — Compliance Officer and Admin only
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPLIANCE_OFFICER')")
    public ResponseEntity<List<AuditLog>> getAllLogs() {
        return ResponseEntity.ok(auditLogService.getAllLogs());
    }

    // GET /api/audit-logs/user/{userId}
    // Logs for a specific user
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPLIANCE_OFFICER')")
    public ResponseEntity<List<AuditLog>> getLogsByUser(
            @PathVariable Long userId) {
        return ResponseEntity.ok(auditLogService.getLogsForUser(userId));
    }

    // GET /api/audit-logs/range?from=...&to=...
    // Logs within a date range
    @GetMapping("/range")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPLIANCE_OFFICER')")
    public ResponseEntity<List<AuditLog>> getLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to) {
        return ResponseEntity.ok(auditLogService.getLogsByDateRange(from, to));
    }
}