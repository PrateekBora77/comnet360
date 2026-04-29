package com.comnet360.provisioning.controller;

import com.comnet360.provisioning.dto.request.CreateConfigurationRequest;
import com.comnet360.provisioning.dto.response.ConfigurationResponse;
import com.comnet360.provisioning.service.ConfigurationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/configurations")
@RequiredArgsConstructor
public class ConfigurationController {

    private final ConfigurationService configurationService;

    // POST /api/configurations/{serviceId}
    @PostMapping("/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER')")
    public ResponseEntity<ConfigurationResponse> addConfiguration(
            @PathVariable Long serviceId,
            @Valid @RequestBody CreateConfigurationRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(configurationService.addConfiguration(
                        serviceId, request, userId));
    }

    // GET /api/configurations/{serviceId}
    @GetMapping("/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','NETWORK_ENGINEER')")
    public ResponseEntity<List<ConfigurationResponse>> getConfigurations(
            @PathVariable Long serviceId) {
        return ResponseEntity.ok(
                configurationService.getConfigurationsForService(serviceId));
    }

    // GET /api/configurations/detail/{configId}
    @GetMapping("/detail/{configId}")
    @PreAuthorize("hasAnyRole('ADMIN','SERVICE_MANAGER','NETWORK_ENGINEER')")
    public ResponseEntity<ConfigurationResponse> getConfigurationById(
            @PathVariable Long configId) {
        return ResponseEntity.ok(
                configurationService.getConfigurationById(configId));
    }

    // DELETE /api/configurations/{configId}
    @DeleteMapping("/{configId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteConfiguration(
            @PathVariable Long configId) {
        configurationService.deleteConfiguration(configId);
        return ResponseEntity.ok(
                Map.of("message", "Configuration deleted successfully"));
    }
}