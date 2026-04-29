package com.comnet360.provisioning.controller;

import com.comnet360.provisioning.dto.request.CreateServiceRequest;
import com.comnet360.provisioning.dto.request.UpdateServiceRequest;
import com.comnet360.provisioning.dto.response.ServiceResponse;
import com.comnet360.provisioning.enums.ServiceStatus;
import com.comnet360.provisioning.enums.ServiceType;
import com.comnet360.provisioning.service.ProvisioningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceController {

    private final ProvisioningService provisioningService;

    // POST /api/services
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<ServiceResponse> createService(
            @Valid @RequestBody CreateServiceRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(provisioningService.createService(request, userId));
    }

    // GET /api/services
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','NETWORK_ENGINEER')")
    public ResponseEntity<List<ServiceResponse>> getAllServices(
            @RequestParam(required = false) ServiceStatus status,
            @RequestParam(required = false) ServiceType type) {

        if (status != null && type != null) {
            return ResponseEntity.ok(
                    provisioningService.getServicesByStatus(status)
                            .stream()
                            .filter(s -> s.getType() == type)
                            .toList());
        }
        if (status != null)
            return ResponseEntity.ok(
                    provisioningService.getServicesByStatus(status));
        if (type != null)
            return ResponseEntity.ok(
                    provisioningService.getServicesByType(type));

        return ResponseEntity.ok(provisioningService.getAllServices());
    }

    // GET /api/services/my
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','ENTERPRISE_USER')")
    public ResponseEntity<List<ServiceResponse>> getMyServices(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(provisioningService.getMyServices(userId));
    }

    // GET /api/services/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','NETWORK_ENGINEER','ENTERPRISE_USER')")
    public ResponseEntity<ServiceResponse> getServiceById(
            @PathVariable Long id) {
        return ResponseEntity.ok(provisioningService.getServiceById(id));
    }

    // PUT /api/services/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<ServiceResponse> updateService(
            @PathVariable Long id,
            @Valid @RequestBody UpdateServiceRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(
                provisioningService.updateService(id, request, userId));
    }

    // PUT /api/services/{id}/activate
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<ServiceResponse> activateService(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader("X-User-Id") Long userId) {
        String reason = body != null ? body.getOrDefault("reason", "Activated") : "Activated";
        return ResponseEntity.ok(
                provisioningService.activateService(id, userId, reason));
    }

    // PUT /api/services/{id}/deactivate
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<ServiceResponse> deactivateService(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader("X-User-Id") Long userId) {
        String reason = body != null ? body.getOrDefault("reason", "Deactivated") : "Deactivated";
        return ResponseEntity.ok(
                provisioningService.deactivateService(id, userId, reason));
    }

    // PUT /api/services/{id}/decommission
    @PutMapping("/{id}/decommission")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ServiceResponse> decommissionService(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader("X-User-Id") Long userId) {
        String reason = body != null ? body.getOrDefault("reason", "Decommissioned") : "Decommissioned";
        return ResponseEntity.ok(
                provisioningService.decommissionService(id, userId, reason));
    }
}