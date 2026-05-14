package com.comnet360.incident.service;

import com.comnet360.incident.dto.request.CreateActionRequest;
import com.comnet360.incident.dto.response.ResolutionActionResponse;
import com.comnet360.incident.entity.ResolutionAction;
import com.comnet360.incident.enums.ActionStatus;
import com.comnet360.incident.exception.BadRequestException;
import com.comnet360.incident.exception.ResourceNotFoundException;
import com.comnet360.incident.repository.IncidentRepository;
import com.comnet360.incident.repository.ResolutionActionRepository;
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
public class ResolutionActionService {

    private final ResolutionActionRepository actionRepository;
    private final IncidentRepository         incidentRepository;

    // ── Create ───────────────────────────────────────────────────

    @Transactional
    public ResolutionActionResponse createAction(Long incidentId,
                                                 CreateActionRequest request) {
        // Verify incident exists
        if (!incidentRepository.existsById(incidentId)) {
            throw new ResourceNotFoundException(
                    "Incident not found with id: " + incidentId);
        }

        ResolutionAction action = ResolutionAction.builder()
                .incidentId(incidentId)
                .ownerId(request.getOwnerId())
                .actionDescription(request.getActionDescription())
                .dueDate(request.getDueDate())
                .status(ActionStatus.PENDING)
                .build();

        action = actionRepository.save(action);
        log.info("Resolution action created: id={} incidentId={}",
                action.getActionId(), incidentId);
        return toResponse(action);
    }

    // ── Read ─────────────────────────────────────────────────────

    public List<ResolutionActionResponse> getActionsByIncident(Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw new ResourceNotFoundException(
                    "Incident not found with id: " + incidentId);
        }
        return actionRepository
                .findByIncidentIdOrderByCreatedAtDesc(incidentId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ResolutionActionResponse getActionById(Long actionId) {
        return toResponse(findById(actionId));
    }

    public List<ResolutionActionResponse> getActionsByOwner(Long ownerId) {
        return actionRepository
                .findByOwnerIdOrderByCreatedAtDesc(ownerId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Update Status ─────────────────────────────────────────────

    @Transactional
    public ResolutionActionResponse updateActionStatus(Long actionId,
                                                       ActionStatus newStatus) {
        ResolutionAction action = findById(actionId);

        // Cannot change a cancelled or completed action
        if (action.getStatus() == ActionStatus.CANCELLED
                || action.getStatus() == ActionStatus.COMPLETED) {
            throw new BadRequestException(
                    "Cannot update a " + action.getStatus().name().toLowerCase()
                            + " action");
        }

        action.setStatus(newStatus);

        // Set completedAt when marking as COMPLETED
        if (newStatus == ActionStatus.COMPLETED) {
            action.setCompletedAt(LocalDateTime.now());
        }

        action = actionRepository.save(action);
        log.info("Action {} status updated to {}", actionId, newStatus);
        return toResponse(action);
    }

    // ── Private Helpers ──────────────────────────────────────────

    private ResolutionAction findById(Long actionId) {
        return actionRepository.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Resolution action not found with id: " + actionId));
    }

    private ResolutionActionResponse toResponse(ResolutionAction action) {
        return ResolutionActionResponse.builder()
                .actionId(action.getActionId())
                .incidentId(action.getIncidentId())
                .ownerId(action.getOwnerId())
                .actionDescription(action.getActionDescription())
                .dueDate(action.getDueDate())
                .status(action.getStatus())
                .completedAt(action.getCompletedAt())
                .createdAt(action.getCreatedAt())
                .updatedAt(action.getUpdatedAt())
                .build();
    }
}