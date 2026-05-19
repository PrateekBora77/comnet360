package com.comnet360.incident.controller;

import com.comnet360.incident.dto.request.CreateActionRequest;
import com.comnet360.incident.dto.response.ResolutionActionResponse;
import com.comnet360.incident.enums.ActionStatus;
import com.comnet360.incident.service.ResolutionActionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/actions")
@RequiredArgsConstructor
public class ActionController {

    private final ResolutionActionService actionService;

    // POST /api/actions/incident/{incidentId}
    @PostMapping("/incident/{incidentId}")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER')")
    public ResponseEntity<ResolutionActionResponse> createAction(
            @PathVariable Long incidentId,
            @Valid @RequestBody CreateActionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(actionService.createAction(incidentId, request));
    }

    // GET /api/actions/incident/{incidentId}
    @GetMapping("/incident/{incidentId}")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<ResolutionActionResponse>> getActionsByIncident(
            @PathVariable Long incidentId) {
        return ResponseEntity.ok(
                actionService.getActionsByIncident(incidentId));
    }

    // GET /api/actions/{actionId}
    @GetMapping("/{actionId}")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<ResolutionActionResponse> getActionById(
            @PathVariable Long actionId) {
        return ResponseEntity.ok(actionService.getActionById(actionId));
    }

    // GET /api/actions/owner/{ownerId}
    @GetMapping("/owner/{ownerId}")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<ResolutionActionResponse>> getActionsByOwner(
            @PathVariable Long ownerId) {
        return ResponseEntity.ok(actionService.getActionsByOwner(ownerId));
    }

    // PUT /api/actions/{actionId}/status
    @PutMapping("/{actionId}/status")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER')")
    public ResponseEntity<ResolutionActionResponse> updateStatus(
            @PathVariable Long actionId,
            @RequestBody Map<String, String> body) {
        String raw = body.get("status");
        if (raw == null || raw.isBlank()) {
            throw new com.comnet360.incident.exception.BadRequestException(
                    "Request body must contain a 'status' field");
        }
        ActionStatus status;
        try {
            status = ActionStatus.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new com.comnet360.incident.exception.BadRequestException(
                    "Invalid status '" + raw + "'. Valid values: PENDING, IN_PROGRESS, COMPLETED, CANCELLED");
        }
        return ResponseEntity.ok(
                actionService.updateActionStatus(actionId, status));
    }
}