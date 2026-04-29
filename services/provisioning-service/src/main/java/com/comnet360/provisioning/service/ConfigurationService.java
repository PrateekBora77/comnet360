package com.comnet360.provisioning.service;

import com.comnet360.provisioning.dto.request.CreateConfigurationRequest;
import com.comnet360.provisioning.dto.response.ConfigurationResponse;
import com.comnet360.provisioning.entity.Configuration;
import com.comnet360.provisioning.exception.ResourceNotFoundException;
import com.comnet360.provisioning.repository.ConfigurationRepository;
import com.comnet360.provisioning.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConfigurationService {

    private final ConfigurationRepository configurationRepository;
    private final ServiceRepository       serviceRepository;

    // ── Create ───────────────────────────────────────────────────

    @Transactional
    public ConfigurationResponse addConfiguration(Long serviceId,
                                                  CreateConfigurationRequest request,
                                                  Long createdBy) {
        // Verify service exists
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException(
                    "Service not found with id: " + serviceId);
        }

        Configuration config = Configuration.builder()
                .serviceId(serviceId)
                .parameter(request.getParameter())
                .value(request.getValue())
                .effectiveDate(request.getEffectiveDate())
                .createdBy(createdBy)
                .build();

        config = configurationRepository.save(config);
        log.info("Configuration added: serviceId={} param={}",
                serviceId, request.getParameter());
        return toResponse(config);
    }

    // ── Read ─────────────────────────────────────────────────────

    public List<ConfigurationResponse> getConfigurationsForService(
            Long serviceId) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException(
                    "Service not found with id: " + serviceId);
        }
        return configurationRepository
                .findByServiceIdOrderByEffectiveDateDesc(serviceId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ConfigurationResponse getConfigurationById(Long configId) {
        Configuration config = configurationRepository.findById(configId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Configuration not found with id: " + configId));
        return toResponse(config);
    }

    // ── Delete ───────────────────────────────────────────────────

    @Transactional
    public void deleteConfiguration(Long configId) {
        if (!configurationRepository.existsById(configId)) {
            throw new ResourceNotFoundException(
                    "Configuration not found with id: " + configId);
        }
        configurationRepository.deleteById(configId);
        log.info("Configuration deleted: id={}", configId);
    }

    // ── Helper ───────────────────────────────────────────────────

    private ConfigurationResponse toResponse(Configuration config) {
        return ConfigurationResponse.builder()
                .configId(config.getConfigId())
                .serviceId(config.getServiceId())
                .parameter(config.getParameter())
                .value(config.getValue())
                .effectiveDate(config.getEffectiveDate())
                .createdBy(config.getCreatedBy())
                .createdAt(config.getCreatedAt())
                .build();
    }
}