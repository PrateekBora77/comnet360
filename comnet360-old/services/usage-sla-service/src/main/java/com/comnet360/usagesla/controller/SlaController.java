package com.comnet360.usagesla.controller;

import com.comnet360.usagesla.dto.request.CreateSlaRequest;
import com.comnet360.usagesla.dto.request.PatchSlaRequest;
import com.comnet360.usagesla.dto.response.SlaBreachEventResponse;
import com.comnet360.usagesla.dto.response.SlaDefinitionResponse;
import com.comnet360.usagesla.enums.SlaStatus;
import com.comnet360.usagesla.service.SlaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sla")
@RequiredArgsConstructor
public class SlaController {

    private final SlaService slaService;

    // ── SLA Definitions ──────────────────────────────────────────

    // POST /api/sla
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<SlaDefinitionResponse> createSla(
            @Valid @RequestBody CreateSlaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(slaService.createSla(request));
    }

    // GET /api/sla
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','NETWORK_ENGINEER')")
    public ResponseEntity<List<SlaDefinitionResponse>> getAllSlas() {
        return ResponseEntity.ok(slaService.getAllSlas());
    }

    // GET /api/sla/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','NETWORK_ENGINEER')")
    public ResponseEntity<SlaDefinitionResponse> getSlaById(
            @PathVariable Long id) {
        return ResponseEntity.ok(slaService.getSlaById(id));
    }

    // GET /api/sla/service/{serviceId}
    @GetMapping("/service/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','NETWORK_ENGINEER')")
    public ResponseEntity<List<SlaDefinitionResponse>> getSlasByService(
            @PathVariable Long serviceId) {
        return ResponseEntity.ok(slaService.getSlasByService(serviceId));
    }

    // PATCH /api/sla/{id} — update threshold, operator, unit, or description
    // serviceId and metric are not patchable (structural fields)
    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<SlaDefinitionResponse> patchSla(
            @PathVariable Long id,
            @Valid @RequestBody PatchSlaRequest request) {
        return ResponseEntity.ok(slaService.patchSla(id, request));
    }

    // PUT /api/sla/{id}/status
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<SlaDefinitionResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String raw = body.get("status");
        if (raw == null || raw.isBlank()) {
            throw new com.comnet360.usagesla.exception.BadRequestException(
                    "Request body must contain a 'status' field");
        }
        SlaStatus status;
        try {
            status = SlaStatus.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new com.comnet360.usagesla.exception.BadRequestException(
                    "Invalid status '" + raw + "'. Valid values: ACTIVE, INACTIVE");
        }
        return ResponseEntity.ok(slaService.updateSlaStatus(id, status));
    }

    // DELETE /api/sla/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteSla(
            @PathVariable Long id) {
        slaService.deleteSla(id);
        return ResponseEntity.ok(Map.of("message", "SLA deleted successfully"));
    }

    // ── Breach Events ─────────────────────────────────────────────

    // GET /api/sla/breaches
    @GetMapping("/breaches")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','NETWORK_ENGINEER')")
    public ResponseEntity<List<SlaBreachEventResponse>> getAllBreaches() {
        return ResponseEntity.ok(slaService.getAllBreaches());
    }

    // GET /api/sla/breaches/unresolved
    @GetMapping("/breaches/unresolved")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','NETWORK_ENGINEER')")
    public ResponseEntity<List<SlaBreachEventResponse>> getUnresolvedBreaches() {
        return ResponseEntity.ok(slaService.getUnresolvedBreaches());
    }

    // GET /api/sla/breaches/service/{serviceId}
    @GetMapping("/breaches/service/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','NETWORK_ENGINEER')")
    public ResponseEntity<List<SlaBreachEventResponse>> getBreachesByService(
            @PathVariable Long serviceId) {
        return ResponseEntity.ok(slaService.getBreachesByService(serviceId));
    }

    // PUT /api/sla/breaches/{breachId}/resolve
    @PutMapping("/breaches/{breachId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','NETWORK_ENGINEER')")
    public ResponseEntity<SlaBreachEventResponse> resolveBreach(
            @PathVariable Long breachId) {
        return ResponseEntity.ok(slaService.resolveBreachEvent(breachId));
    }
}