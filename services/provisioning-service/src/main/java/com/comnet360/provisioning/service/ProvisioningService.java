package com.comnet360.provisioning.service;

import com.comnet360.provisioning.dto.request.CreateServiceRequest;
import com.comnet360.provisioning.dto.request.UpdateServiceRequest;
import com.comnet360.provisioning.dto.response.ServiceResponse;
import com.comnet360.provisioning.entity.Service;
import com.comnet360.provisioning.entity.ServiceLifecycleEvent;
import com.comnet360.provisioning.enums.ServiceStatus;
import com.comnet360.provisioning.enums.ServiceType;
import com.comnet360.provisioning.exception.BadRequestException;
import com.comnet360.provisioning.exception.ConflictException;
import com.comnet360.provisioning.exception.ResourceNotFoundException;
import com.comnet360.provisioning.repository.ServiceLifecycleEventRepository;
import com.comnet360.provisioning.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ProvisioningService {

    private final ServiceRepository             serviceRepository;
    private final ServiceLifecycleEventRepository lifecycleRepository;

    // ── Create ───────────────────────────────────────────────────

    @Transactional
    public ServiceResponse createService(CreateServiceRequest request,
                                         Long ownerUserId) {
        // Check for duplicate name under same owner
        if (serviceRepository.existsByNameAndOwnerUserId(
                request.getName(), ownerUserId)) {
            throw new ConflictException(
                    "Service with name '" + request.getName() +
                            "' already exists for this owner");
        }

        Service service = Service.builder()
                .name(request.getName())
                .type(request.getType())
                .status(ServiceStatus.DRAFT)
                .configDetails(request.getConfigDetails())
                .ownerUserId(ownerUserId)
                .description(request.getDescription())
                .build();

        service = serviceRepository.save(service);

        // Log initial lifecycle event
        saveLifecycleEvent(service.getServiceId(), null,
                ServiceStatus.DRAFT.name(), ownerUserId,
                "Service created");

        log.info("Service created: id={} name={}", service.getServiceId(), service.getName());
        return toResponse(service);
    }

    // ── Read ─────────────────────────────────────────────────────

    public List<ServiceResponse> getAllServices() {
        return serviceRepository.findAll()
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ServiceResponse getServiceById(Long serviceId) {
        return toResponse(findById(serviceId));
    }

    public List<ServiceResponse> getServicesByStatus(ServiceStatus status) {
        return serviceRepository.findByStatus(status)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ServiceResponse> getServicesByType(ServiceType type) {
        return serviceRepository.findByType(type)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ServiceResponse> getMyServices(Long ownerUserId) {
        return serviceRepository.findByOwnerUserId(ownerUserId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Update ───────────────────────────────────────────────────

    @Transactional
    public ServiceResponse updateService(Long serviceId,
                                         UpdateServiceRequest request,
                                         Long userId) {
        Service service = findById(serviceId);

        // Cannot update a decommissioned service
        if (service.getStatus() == ServiceStatus.DECOMMISSIONED) {
            throw new BadRequestException(
                    "Cannot update a decommissioned service");
        }

        if (request.getName() != null)
            service.setName(request.getName());
        if (request.getDescription() != null)
            service.setDescription(request.getDescription());
        if (request.getConfigDetails() != null)
            service.setConfigDetails(request.getConfigDetails());

        service = serviceRepository.save(service);
        log.info("Service updated: id={}", serviceId);
        return toResponse(service);
    }

    // ── Lifecycle ────────────────────────────────────────────────

    @Transactional
    public ServiceResponse activateService(Long serviceId,
                                           Long userId, String reason) {
        Service service = findById(serviceId);
        validateTransition(service.getStatus(), ServiceStatus.ACTIVE);

        String fromStatus = service.getStatus().name();
        service.setStatus(ServiceStatus.ACTIVE);
        service = serviceRepository.save(service);

        saveLifecycleEvent(serviceId, fromStatus,
                ServiceStatus.ACTIVE.name(), userId, reason);

        log.info("Service activated: id={}", serviceId);
        return toResponse(service);
    }

    @Transactional
    public ServiceResponse deactivateService(Long serviceId,
                                             Long userId, String reason) {
        Service service = findById(serviceId);
        validateTransition(service.getStatus(), ServiceStatus.INACTIVE);

        String fromStatus = service.getStatus().name();
        service.setStatus(ServiceStatus.INACTIVE);
        service = serviceRepository.save(service);

        saveLifecycleEvent(serviceId, fromStatus,
                ServiceStatus.INACTIVE.name(), userId, reason);

        log.info("Service deactivated: id={}", serviceId);
        return toResponse(service);
    }

    @Transactional
    public ServiceResponse decommissionService(Long serviceId,
                                               Long userId, String reason) {
        Service service = findById(serviceId);
        if (service.getStatus() == ServiceStatus.ACTIVE) {
            throw new BadRequestException(
                    "Deactivate the service before decommissioning");
        }

        String fromStatus = service.getStatus().name();
        service.setStatus(ServiceStatus.DECOMMISSIONED);
        service = serviceRepository.save(service);

        saveLifecycleEvent(serviceId, fromStatus,
                ServiceStatus.DECOMMISSIONED.name(), userId, reason);

        log.info("Service decommissioned: id={}", serviceId);
        return toResponse(service);
    }

    // ── Private Helpers ──────────────────────────────────────────

    private Service findById(Long serviceId) {
        return serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service not found with id: " + serviceId));
    }

    private void validateTransition(ServiceStatus current,
                                    ServiceStatus target) {
        boolean valid = switch (target) {
            case ACTIVE -> current == ServiceStatus.DRAFT
                    || current == ServiceStatus.INACTIVE;
            case INACTIVE -> current == ServiceStatus.ACTIVE;
            default -> false;
        };
        if (!valid) {
            throw new BadRequestException(
                    "Invalid status transition from " +
                            current.name() + " to " + target.name());
        }
    }

    private void saveLifecycleEvent(Long serviceId, String fromStatus,
                                    String toStatus, Long changedBy,
                                    String reason) {
        ServiceLifecycleEvent event = ServiceLifecycleEvent.builder()
                .serviceId(serviceId)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .changedBy(changedBy)
                .reason(reason)
                .build();
        lifecycleRepository.save(event);
    }

    public ServiceResponse toResponse(Service service) {
        return ServiceResponse.builder()
                .serviceId(service.getServiceId())
                .name(service.getName())
                .type(service.getType())
                .status(service.getStatus())
                .configDetails(service.getConfigDetails())
                .ownerUserId(service.getOwnerUserId())
                .description(service.getDescription())
                .createdAt(service.getCreatedAt())
                .updatedAt(service.getUpdatedAt())
                .build();
    }
}