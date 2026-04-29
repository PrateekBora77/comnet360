package com.comnet360.analytics.service;

import com.comnet360.analytics.dto.response.DashboardSnapshotResponse;
import com.comnet360.analytics.entity.DashboardSnapshot;
import com.comnet360.analytics.exception.ResourceNotFoundException;
import com.comnet360.analytics.repository.DashboardSnapshotRepository;
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
public class SnapshotService {

    private final DashboardSnapshotRepository snapshotRepository;
    private final AnalyticsDataService        analyticsDataService;
    private final ObjectMapper                objectMapper;

    // Save Snapshot
    @Transactional
    public DashboardSnapshotResponse saveSnapshot(String snapshotType, String data) {
        DashboardSnapshot snapshot = DashboardSnapshot.builder()
                .snapshotType(snapshotType)
                .data(data)
                .build();
        snapshot = snapshotRepository.save(snapshot);
        log.info("Snapshot saved: type={}", snapshotType);
        return toResponse(snapshot);
    }

    // Get Latest Snapshot
    public DashboardSnapshotResponse getLatestSnapshot(String snapshotType) {
        return snapshotRepository
                .findFirstBySnapshotTypeOrderByCapturedAtDesc(snapshotType)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No snapshot found for type: " + snapshotType));
    }

    // Get All Snapshots
    public List<DashboardSnapshotResponse> getAllSnapshots() {
        return snapshotRepository.findAll()
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Generate Operations Dashboard Snapshot
    @Transactional
    public DashboardSnapshotResponse generateOperationsDashboard() {
        try {
            LocalDate today    = LocalDate.now();
            LocalDate monthAgo = today.minusMonths(1);
            var incidentSummary = analyticsDataService.buildIncidentSummary(monthAgo, today);
            Map<String, Object> dashboardData = Map.of(
                    "snapshotType", "OPERATIONS_DASHBOARD",
                    "generatedAt",  java.time.LocalDateTime.now().toString(),
                    "period", Map.of("from", monthAgo.toString(), "to", today.toString()),
                    "incidents", Map.of(
                            "total",      incidentSummary.getTotalIncidents(),
                            "open",       incidentSummary.getOpenIncidents(),
                            "inProgress", incidentSummary.getInProgressIncidents(),
                            "resolved",   incidentSummary.getResolvedIncidents(),
                            "closed",     incidentSummary.getClosedIncidents(),
                            "critical",   incidentSummary.getCriticalIncidents(),
                            "avgMttrMin", incidentSummary.getAverageMttrMinutes()
                    )
            );
            String dataJson = objectMapper.writeValueAsString(dashboardData);
            return saveSnapshot("OPERATIONS_DASHBOARD", dataJson);
        } catch (Exception e) {
            log.error("Error generating operations dashboard: {}", e.getMessage());
            throw new RuntimeException("Failed to generate operations dashboard");
        }
    }

    private DashboardSnapshotResponse toResponse(DashboardSnapshot snapshot) {
        return DashboardSnapshotResponse.builder()
                .snapshotId(snapshot.getSnapshotId())
                .snapshotType(snapshot.getSnapshotType())
                .data(snapshot.getData())
                .capturedAt(snapshot.getCapturedAt())
                .build();
    }
}