package com.comnet360.incident.controller;

import com.comnet360.incident.dto.request.CreateIncidentRequest;
import com.comnet360.incident.dto.request.UpdateIncidentRequest;
import com.comnet360.incident.dto.response.IncidentResponse;
import com.comnet360.incident.enums.IncidentSeverity;
import com.comnet360.incident.enums.IncidentStatus;
import com.comnet360.incident.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    // POST /api/incidents
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER')")
    public ResponseEntity<IncidentResponse> createIncident(
            @Valid @RequestBody CreateIncidentRequest request,
            @RequestHeader(value = "X-User-Id", required = false)
            Long userId) {
        Long effectiveUserId = userId != null ? userId : 0L;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(incidentService.createIncident(request, effectiveUserId));
    }

    // GET /api/incidents
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<IncidentResponse>> getAllIncidents(
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) IncidentSeverity severity) {

        if (status != null && severity != null)
            return ResponseEntity.ok(
                    incidentService.getByStatusAndSeverity(status, severity));
        if (status != null)
            return ResponseEntity.ok(incidentService.getByStatus(status));
        if (severity != null)
            return ResponseEntity.ok(incidentService.getBySeverity(severity));

        return ResponseEntity.ok(incidentService.getAllIncidents());
    }

    // GET /api/incidents/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<IncidentResponse> getIncidentById(
            @PathVariable Long id) {
        return ResponseEntity.ok(incidentService.getIncidentById(id));
    }

    // GET /api/incidents/service/{serviceId}
    @GetMapping("/service/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<IncidentResponse>> getByService(
            @PathVariable Long serviceId) {
        return ResponseEntity.ok(incidentService.getByService(serviceId));
    }

    // GET /api/incidents/assigned/{userId}
    @GetMapping("/assigned/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<IncidentResponse>> getByAssignedTo(
            @PathVariable Long userId) {
        return ResponseEntity.ok(incidentService.getByAssignedTo(userId));
    }

    // PUT /api/incidents/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER')")
    public ResponseEntity<IncidentResponse> updateIncident(
            @PathVariable Long id,
            @RequestBody UpdateIncidentRequest request) {
        return ResponseEntity.ok(incidentService.updateIncident(id, request));
    }

    // PUT /api/incidents/{id}/assign
    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<IncidentResponse> assignIncident(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {
        Long assignedTo = body.get("assignedTo");
        return ResponseEntity.ok(
                incidentService.assignIncident(id, assignedTo));
    }

    // PUT /api/incidents/{id}/resolve
    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER')")
    public ResponseEntity<IncidentResponse> resolveIncident(
            @PathVariable Long id) {
        return ResponseEntity.ok(incidentService.resolveIncident(id));
    }

    // PUT /api/incidents/{id}/close
    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<IncidentResponse> closeIncident(
            @PathVariable Long id) {
        return ResponseEntity.ok(incidentService.closeIncident(id));
    }
}