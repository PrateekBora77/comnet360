package com.comnet360.analytics.controller;

import com.comnet360.analytics.dto.response.DashboardSnapshotResponse;
import com.comnet360.analytics.service.SnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports/snapshots")
@RequiredArgsConstructor
public class SnapshotController {

    private final SnapshotService snapshotService;

    // GET /api/reports/snapshots
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS_HEAD','SERVICE_MANAGER')")
    public ResponseEntity<List<DashboardSnapshotResponse>> getAllSnapshots() {
        return ResponseEntity.ok(snapshotService.getAllSnapshots());
    }

    // GET /api/reports/snapshots/{type}
    // Get the latest snapshot for a given type
    @GetMapping("/{type}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS_HEAD','SERVICE_MANAGER')")
    public ResponseEntity<DashboardSnapshotResponse> getLatestSnapshot(
            @PathVariable String type) {
        return ResponseEntity.ok(
                snapshotService.getLatestSnapshot(type.toUpperCase()));
    }

    // POST /api/reports/snapshots/operations
    // Manually trigger operations dashboard snapshot generation
    @PostMapping("/operations")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS_HEAD')")
    public ResponseEntity<DashboardSnapshotResponse> generateOperationsDashboard() {
        return ResponseEntity.ok(
                snapshotService.generateOperationsDashboard());
    }
}