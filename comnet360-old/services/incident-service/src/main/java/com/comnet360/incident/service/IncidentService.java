package com.comnet360.incident.service;

import com.comnet360.incident.dto.request.CreateIncidentRequest;
import com.comnet360.incident.dto.request.UpdateIncidentRequest;
import com.comnet360.incident.dto.response.IncidentResponse;
import com.comnet360.incident.entity.Incident;
import com.comnet360.incident.enums.IncidentSeverity;
import com.comnet360.incident.enums.IncidentStatus;
import com.comnet360.incident.exception.BadRequestException;
import com.comnet360.incident.exception.ResourceNotFoundException;
import com.comnet360.incident.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;

    // ── Create ───────────────────────────────────────────────────

    @Transactional
    public IncidentResponse createIncident(CreateIncidentRequest request,
                                           Long reportedBy) {
        Incident incident = Incident.builder()
                .serviceId(request.getServiceId())
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(request.getSeverity() != null
                        ? request.getSeverity()
                        : IncidentSeverity.MEDIUM)
                .status(IncidentStatus.OPEN)
                .reportedBy(reportedBy)
                .assignedTo(request.getAssignedTo())
                .build();

        incident = incidentRepository.save(incident);
        log.info("Incident created: id={} title={} severity={}",
                incident.getIncidentId(), incident.getTitle(),
                incident.getSeverity());
        return toResponse(incident);
    }

    // ── Read ─────────────────────────────────────────────────────

    public List<IncidentResponse> getAllIncidents() {
        return incidentRepository.findAll()
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public IncidentResponse getIncidentById(Long incidentId) {
        return toResponse(findById(incidentId));
    }

    public List<IncidentResponse> getByStatus(IncidentStatus status) {
        return incidentRepository
                .findByStatusOrderByDetectedDateDesc(status)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<IncidentResponse> getBySeverity(IncidentSeverity severity) {
        return incidentRepository
                .findBySeverityOrderByDetectedDateDesc(severity)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<IncidentResponse> getByService(Long serviceId) {
        return incidentRepository
                .findByServiceIdOrderByDetectedDateDesc(serviceId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<IncidentResponse> getByAssignedTo(Long userId) {
        return incidentRepository
                .findByAssignedToOrderByDetectedDateDesc(userId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<IncidentResponse> getByStatusAndSeverity(
            IncidentStatus status, IncidentSeverity severity) {
        return incidentRepository
                .findByStatusAndSeverityOrderByDetectedDateDesc(status, severity)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Update ───────────────────────────────────────────────────

    @Transactional
    public IncidentResponse updateIncident(Long incidentId,
                                           UpdateIncidentRequest request) {
        Incident incident = findById(incidentId);

        // Cannot update a closed incident
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw new BadRequestException(
                    "Cannot update a closed incident");
        }

        if (request.getTitle() != null)
            incident.setTitle(request.getTitle());
        if (request.getDescription() != null)
            incident.setDescription(request.getDescription());
        if (request.getSeverity() != null)
            incident.setSeverity(request.getSeverity());
        if (request.getAssignedTo() != null)
            incident.setAssignedTo(request.getAssignedTo());

        // Handle status transitions
        if (request.getStatus() != null) {
            validateStatusTransition(incident.getStatus(), request.getStatus());
            incident.setStatus(request.getStatus());

            // Set resolvedDate when moving to RESOLVED
            if (request.getStatus() == IncidentStatus.RESOLVED
                    && incident.getResolvedDate() == null) {
                incident.setResolvedDate(LocalDateTime.now());
            }
        }

        incident = incidentRepository.save(incident);
        log.info("Incident updated: id={} status={}", incidentId,
                incident.getStatus());
        return toResponse(incident);
    }

    // ── Quick Status Transitions ─────────────────────────────────

    @Transactional
    public IncidentResponse assignIncident(Long incidentId, Long assignedTo) {
        Incident incident = findById(incidentId);
        incident.setAssignedTo(assignedTo);
        if (incident.getStatus() == IncidentStatus.OPEN) {
            incident.setStatus(IncidentStatus.IN_PROGRESS);
        }
        incident = incidentRepository.save(incident);
        log.info("Incident {} assigned to user {}", incidentId, assignedTo);
        return toResponse(incident);
    }

    @Transactional
    public IncidentResponse resolveIncident(Long incidentId) {
        Incident incident = findById(incidentId);
        validateStatusTransition(incident.getStatus(), IncidentStatus.RESOLVED);
        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolvedDate(LocalDateTime.now());
        incident = incidentRepository.save(incident);
        log.info("Incident {} resolved", incidentId);
        return toResponse(incident);
    }

    @Transactional
    public IncidentResponse closeIncident(Long incidentId) {
        Incident incident = findById(incidentId);
        validateStatusTransition(incident.getStatus(), IncidentStatus.CLOSED);
        incident.setStatus(IncidentStatus.CLOSED);
        incident = incidentRepository.save(incident);
        log.info("Incident {} closed", incidentId);
        return toResponse(incident);
    }

    // ── Private Helpers ──────────────────────────────────────────

    private Incident findById(Long incidentId) {
        return incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Incident not found with id: " + incidentId));
    }

    private void validateStatusTransition(IncidentStatus current,
                                          IncidentStatus target) {
        boolean valid = switch (target) {
            case IN_PROGRESS -> current == IncidentStatus.OPEN;
            case RESOLVED    -> current == IncidentStatus.OPEN
                    || current == IncidentStatus.IN_PROGRESS;
            case CLOSED      -> current == IncidentStatus.RESOLVED;
            default          -> false;
        };
        if (!valid) {
            throw new BadRequestException(
                    "Invalid status transition from "
                            + current.name() + " to " + target.name());
        }
    }

    public IncidentResponse toResponse(Incident incident) {
        return IncidentResponse.builder()
                .incidentId(incident.getIncidentId())
                .serviceId(incident.getServiceId())
                .title(incident.getTitle())
                .description(incident.getDescription())
                .severity(incident.getSeverity())
                .status(incident.getStatus())
                .detectedDate(incident.getDetectedDate())
                .resolvedDate(incident.getResolvedDate())
                .reportedBy(incident.getReportedBy())
                .assignedTo(incident.getAssignedTo())
                .build();
    }
}